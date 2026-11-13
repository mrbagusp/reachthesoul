/**
 * RTS Daily Outreach Job
 * ──────────────────────────────────────────────────────────────────────────
 * Tiap jam 09:00 Asia/Jakarta:
 *   1. Ambil 2 kota berikutnya dari `outreach_cities` (urut: order, lalu yang
 *      lastProcessedAt paling lama / belum pernah).
 *   2. Untuk tiap kota: cari gereja via Google Places (meniru /api/scrape),
 *      lalu ambil email dari website tiap gereja (meniru /api/scrape/enrich).
 *   3. Saring:
 *        - email yang SUDAH pernah dikirim (koleksi `outreach_sent`)  → skip
 *        - email yang opt-out (koleksi `email_unsubscribes`)          → skip
 *        - gereja TANPA email  → simpan ke `outreach_prospects` (perlu DM/form),
 *          tidak dikirimi.
 *   4. Gereja dengan email baru → buat SATU campaign harian lewat koleksi
 *      `campaigns` + `campaign_recipients` (format sama persis dengan
 *      createCampaign). Mesin `processCampaignQueueScheduled` yang sudah ada
 *      yang mengirim pelan-pelan (10/jam lewat limiter di bawah).
 *   5. Catat tiap email ke `outreach_sent` + update kota.
 *
 * Kill switch: dokumen `platform_config/outreach` → { enabled: false } untuk
 * menghentikan tanpa redeploy.
 *
 * Tidak mengubah file lain. Hanya perlu 1 baris export di index.ts.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

function getDb() {
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}

// ── Konfigurasi (bisa dioverride lewat platform_config/outreach) ────────────
const DEFAULTS = {
  enabled: true,
  citiesPerDay: 2,
  maxEmailsPerCity: 20,     // hasil Places maksimum 20 per kota
  perHourCap: 10,           // batas aman kirim: 10 email / jam
  minReviews: 0,            // boleh dinaikkan untuk saring gereja kecil/mati
};

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";

// ── Util: normalisasi email jadi doc id yang aman untuk Firestore ───────────
function emailKey(email: string): string {
  return String(email).trim().toLowerCase().replace(/[^a-z0-9._%+-]/g, "_");
}

// ── Google Places search (disalin dari app/api/scrape/route.ts) ─────────────
interface Place {
  id: string; name: string; address: string; phone: string;
  website: string; rating: number; reviews: number;
}

async function searchPlaces(query: string, city: string): Promise<Place[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    logger.error("[dailyOutreach] GOOGLE_PLACES_API_KEY not set");
    return [];
  }
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({ textQuery: `${query} in ${city}`, maxResultCount: 20 }),
    });
    if (!response.ok) {
      logger.warn(`[dailyOutreach] Places API ${response.status} for "${query} in ${city}"`);
      return [];
    }
    const data: any = await response.json();
    return (data.places || []).map((p: any) => ({
      id: p.id,
      name: p.displayName?.text || "Unknown",
      address: p.formattedAddress || "",
      phone: p.internationalPhoneNumber || p.nationalPhoneNumber || "",
      website: p.websiteUri || "",
      rating: p.rating || 0,
      reviews: p.userRatingCount || 0,
    }));
  } catch (err) {
    logger.error("[dailyOutreach] searchPlaces failed:", err);
    return [];
  }
}

// ── Email extraction (disalin dari app/api/scrape/enrich/route.ts) ──────────
function extractEmails(html: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(emailRegex) || [];
  return [...new Set(matches.filter((email) => {
    const lower = email.toLowerCase();
    return !lower.includes("example.com") && !lower.includes("sentry") &&
      !lower.includes("webpack") && !lower.includes(".png") &&
      !lower.includes(".jpg") && !lower.includes(".css") &&
      !lower.includes(".js") && !lower.includes("@2x") &&
      !lower.endsWith(".woff") && !lower.endsWith(".svg") &&
      !lower.includes("wixpress") && !lower.includes("googleapis") &&
      lower.length < 60;
  }))];
}

async function fetchEmailsFromWebsite(website: string): Promise<string[]> {
  if (!website) return [];
  let emails: string[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(website, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (response.ok) emails = extractEmails(await response.text());
  } catch { /* ignore */ }

  if (emails.length === 0) {
    const contactPaths = ["/contact", "/contact-us", "/about", "/about-us", "/connect"];
    for (const path of contactPaths) {
      try {
        const baseUrl = new URL(website);
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 6000);
        const r = await fetch(`${baseUrl.origin}${path}`, {
          signal: c.signal,
          headers: { "User-Agent": "Mozilla/5.0" },
          redirect: "follow",
        });
        clearTimeout(t);
        if (r.ok) {
          emails = [...new Set([...emails, ...extractEmails(await r.text())])];
          if (emails.length > 0) break;
        }
      } catch { /* ignore */ }
    }
  }
  return emails;
}

/** Pilih 1 email terbaik dari daftar (hindari noreply, utamakan info/contact/hello). */
function pickBestEmail(emails: string[]): string {
  if (emails.length === 0) return "";
  const usable = emails.filter((e) => !/^(no-?reply|donotreply|postmaster|mailer-daemon)@/i.test(e));
  const list = usable.length ? usable : emails;
  const preferred = list.find((e) => /^(info|contact|hello|admin|office|church|pastor|connect)@/i.test(e));
  return (preferred ?? list[0]).toLowerCase();
}

// ── Template email outreach (default) ───────────────────────────────────────
// Disimpan di platform_config/outreach kalau mau diubah tanpa deploy.
const DEFAULT_SUBJECT = "A simpler way to care for every soul who reaches {{church}}";
const DEFAULT_BODY = `Dear {{church}} team,

Every week, messages come in from people asking for prayer, counseling, or a listening ear — across WhatsApp, Instagram, Facebook, your website, and email. When the volume grows, it is easy for some of them to slip through the cracks.

ReachTheSoul brings all of those conversations into one simple inbox, so your team can respond to every person, follow their journey from the first prayer to lasting faith, and never lose track of anyone who reached out.

It is built by people who have spent years running prayer and follow-up ministry, not just software engineers — so it is shaped around how ministry actually works.

If this sounds helpful for {{church}}, you can see how it works here:
https://reachthesoul.org

Grace and peace,
The ReachTheSoul Team`;

// ── Ambil konfigurasi runtime (merge dengan default) ────────────────────────
async function loadConfig(db: admin.firestore.Firestore) {
  const snap = await db.doc("platform_config/outreach").get();
  const cfg = snap.exists ? (snap.data() ?? {}) : {};
  return {
    enabled: cfg.enabled ?? DEFAULTS.enabled,
    citiesPerDay: cfg.citiesPerDay ?? DEFAULTS.citiesPerDay,
    maxEmailsPerCity: cfg.maxEmailsPerCity ?? DEFAULTS.maxEmailsPerCity,
    minReviews: cfg.minReviews ?? DEFAULTS.minReviews,
    subject: cfg.subject ?? DEFAULT_SUBJECT,
    body: cfg.body ?? DEFAULT_BODY,
  };
}

// ── Inti: proses outreach harian ────────────────────────────────────────────
async function runDailyOutreach(): Promise<Record<string, any>> {
  const db = getDb();
  const FieldValue = admin.firestore.FieldValue;
  const cfg = await loadConfig(db);

  if (!cfg.enabled) {
    logger.info("[dailyOutreach] Disabled via platform_config/outreach — skipping");
    return { skipped: "disabled" };
  }

  // 1) Ambil kota aktif, urut order; pilih yang paling lama belum diproses.
  const citiesSnap = await db.collection("outreach_cities")
    .where("active", "==", true)
    .get();
  if (citiesSnap.empty) {
    logger.warn("[dailyOutreach] No active cities in outreach_cities");
    return { skipped: "no_cities" };
  }

  const cities = citiesSnap.docs
    .map((d) => ({ ref: d.ref, ...(d.data() as any) }))
    .sort((a, b) => {
      const ta = a.lastProcessedAt?.toMillis?.() ?? 0;
      const tb = b.lastProcessedAt?.toMillis?.() ?? 0;
      if (ta !== tb) return ta - tb;              // paling lama / belum pernah duluan
      return (a.order ?? 999) - (b.order ?? 999); // lalu urut order
    })
    .slice(0, cfg.citiesPerDay);

  const recipients: Array<{ name: string; church: string; city: string; email: string }> = [];
  let prospectsSaved = 0, alreadySent = 0, optedOut = 0, noEmail = 0, found = 0;

  for (const city of cities) {
    const cityLabel = city.country ? `${city.city}, ${city.country}` : city.city;

    // Cari dengan beberapa kata kunci (gereja + ministry + prayer/counseling center),
    // lalu gabung & buang duplikat berdasarkan placeId.
    const terms: string[] = Array.isArray(city.searchTerms) && city.searchTerms.length
      ? city.searchTerms
      : [city.searchTerm || "church"];
    const byId = new Map<string, Place>();
    for (const term of terms) {
      const results = await searchPlaces(term, cityLabel);
      for (const p of results) {
        if (p.id && !byId.has(p.id)) byId.set(p.id, p);
      }
    }
    const places = [...byId.values()];
    found += places.length;

    for (const place of places) {
      if ((place.reviews ?? 0) < cfg.minReviews) continue;

      // Tak ada website → tak ada email → prospek (perlu DM/form)
      if (!place.website) {
        await saveProspect(db, place, city, "no_website");
        prospectsSaved++; noEmail++;
        continue;
      }

      const emails = await fetchEmailsFromWebsite(place.website);
      const email = pickBestEmail(emails);

      if (!email) {
        await saveProspect(db, place, city, "no_email_found");
        prospectsSaved++; noEmail++;
        continue;
      }

      const key = emailKey(email);

      // Anti-dobel: sudah pernah dikirim?
      const sentDoc = await db.doc(`outreach_sent/${key}`).get();
      if (sentDoc.exists) { alreadySent++; continue; }

      // Opt-out?
      const unsub = await db.doc(`email_unsubscribes/${email.toLowerCase()}`).get();
      if (unsub.exists) { optedOut++; continue; }

      recipients.push({
        name: "",                    // nama pastor tidak diketahui dari Places
        church: place.name,
        city: cityLabel,
        email,
      });

      // Catat SEKARANG supaya hari lain / kota lain tidak memilih email yang sama.
      await db.doc(`outreach_sent/${key}`).set({
        email: email.toLowerCase(),
        church: place.name,
        city: cityLabel,
        country: city.country ?? "",
        website: place.website,
        placeId: place.id,
        queuedAt: FieldValue.serverTimestamp(),
      });
    }

    await city.ref.update({
      lastProcessedAt: FieldValue.serverTimestamp(),
      lastResult: { found: places.length, at: new Date().toISOString() },
    });
  }

  // 4) Buat 1 campaign untuk semua email baru hari ini (format = createCampaign).
  let campaignId: string | null = null;
  if (recipients.length > 0) {
    const campaignRef = db.collection("campaigns").doc();
    campaignId = campaignRef.id;
    await campaignRef.set({
      name: `Daily Outreach ${new Date().toISOString().slice(0, 10)} (${cities.map((c) => c.city).join(", ")})`,
      type: "blast",
      channel: "email",
      subject: cfg.subject,
      templateBody: cfg.body,
      status: "sending",
      source: "daily_outreach",   // penanda supaya mudah dibedakan dari campaign manual
      stats: { total: recipients.length, sent: 0, failed: 0, opened: 0, clicked: 0, replied: 0, signedUp: 0 },
      createdBy: "daily_outreach",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Tulis recipients (batch per 400 biar aman dari limit 500/batch)
    const chunks: typeof recipients[] = [];
    for (let i = 0; i < recipients.length; i += 400) chunks.push(recipients.slice(i, i + 400));
    for (const chunk of chunks) {
      const batch = db.batch();
      for (const r of chunk) {
        batch.set(db.collection("campaign_recipients").doc(), {
          campaignId,
          name: r.name, church: r.church, city: r.city,
          email: r.email, whatsapp: "",
          channel: "email",
          status: "pending",
          source: "daily_outreach",
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }
  }

  const summary = {
    cities: cities.map((c) => c.city),
    placesFound: found,
    newEmails: recipients.length,
    prospectsSaved, alreadySent, optedOut, noEmail,
    campaignId,
  };
  logger.info("[dailyOutreach] Done", summary);

  // Log ringkasan harian (untuk dashboard/monitoring)
  await db.collection("outreach_runs").add({
    ...summary,
    ranAt: FieldValue.serverTimestamp(),
  });

  return summary;
}

async function saveProspect(
  db: admin.firestore.Firestore,
  place: Place,
  city: any,
  reason: string,
): Promise<void> {
  // 1 dok per placeId supaya tidak dobel
  const ref = db.doc(`outreach_prospects/${place.id}`);
  const exists = await ref.get();
  if (exists.exists) return;
  await ref.set({
    name: place.name,
    city: city.city,
    country: city.country ?? "",
    address: place.address,
    phone: place.phone,
    website: place.website,
    rating: place.rating,
    reviews: place.reviews,
    needsManualOutreach: true,   // perlu di-DM / lewat form
    reason,                      // "no_website" | "no_email_found"
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ── SCHEDULED: tiap jam 09:00 Asia/Jakarta ──────────────────────────────────
export const dailyOutreachJob = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Asia/Jakarta",
    timeoutSeconds: 540,          // 9 menit — scraping 2 kota + enrich bisa lama
    memory: "512MiB",
    region: "asia-southeast1",
  },
  async () => {
    try {
      await runDailyOutreach();
    } catch (err) {
      logger.error("[dailyOutreachJob] Fatal:", err);
    }
  }
);

// ── HTTP trigger (uji manual tanpa menunggu jam 9) ──────────────────────────
// Lindungi dengan token: set OUTREACH_TRIGGER_TOKEN di functions/.env, panggil
//   https://.../dailyOutreachRunNow?token=XXXX
export const dailyOutreachRunNow = onRequest(
  { region: "asia-southeast1", timeoutSeconds: 540, memory: "512MiB" },
  async (req, res) => {
    const token = process.env.OUTREACH_TRIGGER_TOKEN ?? "";
    if (token && req.query.token !== token) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      const result = await runDailyOutreach();
      res.status(200).json(result);
    } catch (err: any) {
      logger.error("[dailyOutreachRunNow] Error:", err);
      res.status(500).json({ error: err?.message ?? "error" });
    }
  }
);

// ── CALLABLE: tombol "Jalankan sekarang" di dashboard Auto Outreach ──────────
// Hanya platform admin yang boleh. Dipanggil dari AutoOutreach.tsx via httpsCallable.
export const runDailyOutreachNow = onCall(
  { region: "asia-southeast1", timeoutSeconds: 540, memory: "512MiB" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    const db = getDb();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    if (userDoc.data()?.isPlatformAdmin !== true) {
      throw new HttpsError("permission-denied", "Platform admin only.");
    }
    try {
      return await runDailyOutreach();
    } catch (err: any) {
      logger.error("[runDailyOutreachNow] Error:", err);
      throw new HttpsError("internal", err?.message ?? "error");
    }
  }
);
