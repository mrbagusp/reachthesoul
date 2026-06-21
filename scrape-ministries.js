#!/usr/bin/env node

/**
 * RTS Ministry Scraper — Christian Media Ministry Lead Generator
 * 
 * Finds Christian media ministries (CBN, TBN, CGN, etc.) and their
 * country-specific offices. Extracts email, phone, and website.
 * 
 * Usage:
 *   node scrape-ministries.js                    → scrape all known ministries
 *   node scrape-ministries.js --country=Indonesia → only Indonesian offices
 *   node scrape-ministries.js --search "prayer ministry" "Nigeria,Ghana,Kenya"
 * 
 * Output: ministries_[date].csv — ready to upload to Campaign Manager
 */

const fs = require("fs");

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || "AIzaSyBKM1xMcb57AQznRFcLyb1KoPl3gM-edC4";

// ─── Seed Database: Known Global Christian Media Ministries ───
const KNOWN_MINISTRIES = [
  // USA-based global ministries
  { name: "CBN (Christian Broadcasting Network)", hq: "Virginia Beach, USA", website: "https://www.cbn.com", category: "media_ministry" },
  { name: "TBN (Trinity Broadcasting Network)", hq: "Costa Mesa, USA", website: "https://www.tbn.org", category: "media_ministry" },
  { name: "Daystar Television Network", hq: "Dallas, USA", website: "https://www.daystar.com", category: "media_ministry" },
  { name: "Joyce Meyer Ministries", hq: "Fenton, USA", website: "https://www.joycemeyer.org", category: "media_ministry" },
  { name: "Joel Osteen Ministries", hq: "Houston, USA", website: "https://www.joelosteen.com", category: "media_ministry" },
  { name: "Benny Hinn Ministries", hq: "Grapevine, USA", website: "https://www.bennyhinn.org", category: "media_ministry" },
  { name: "Billy Graham Evangelistic Association", hq: "Charlotte, USA", website: "https://billygraham.org", category: "media_ministry" },
  { name: "Cru (Campus Crusade for Christ)", hq: "Orlando, USA", website: "https://www.cru.org", category: "ministry" },
  { name: "Focus on the Family", hq: "Colorado Springs, USA", website: "https://www.focusonthefamily.com", category: "media_ministry" },
  { name: "In Touch Ministries (Charles Stanley)", hq: "Atlanta, USA", website: "https://www.intouch.org", category: "media_ministry" },
  { name: "Turning Point (David Jeremiah)", hq: "San Diego, USA", website: "https://www.davidjeremiah.org", category: "media_ministry" },
  { name: "Amazing Facts International", hq: "Sacramento, USA", website: "https://www.amazingfacts.org", category: "media_ministry" },
  { name: "Gospel for Asia (GFA World)", hq: "Wills Point, USA", website: "https://www.gfa.org", category: "ministry" },
  { name: "Jesus Film Project", hq: "Orlando, USA", website: "https://www.jesusfilm.org", category: "media_ministry" },
  { name: "YouVersion (Life.Church)", hq: "Oklahoma City, USA", website: "https://www.youversion.com", category: "tech_ministry" },
  { name: "Compassion International", hq: "Colorado Springs, USA", website: "https://www.compassion.com", category: "ministry" },
  { name: "World Vision", hq: "Federal Way, USA", website: "https://www.worldvision.org", category: "ministry" },
  { name: "Samaritan's Purse", hq: "Boone, USA", website: "https://www.samaritanspurse.org", category: "ministry" },
  { name: "K-LOVE Radio", hq: "Rocklin, USA", website: "https://www.klove.com", category: "media_ministry" },
  { name: "Moody Radio", hq: "Chicago, USA", website: "https://www.moodyradio.org", category: "media_ministry" },

  // Indonesia-based ministries
  { name: "CBN Indonesia", hq: "Jakarta, Indonesia", website: "https://www.cbn.id", category: "media_ministry" },
  { name: "CGN (Christian Global Network)", hq: "Indonesia", website: "https://www.cgn.co.id", category: "media_ministry" },
  { name: "PijarTV", hq: "Indonesia", website: "https://www.pijartv.com", category: "media_ministry" },
  { name: "Lifechannel", hq: "Indonesia", website: "https://www.lifechannel.id", category: "media_ministry" },
  { name: "U-Channel", hq: "Indonesia", website: "https://www.uchannel.id", category: "media_ministry" },
  { name: "Jawaban.com (CBN Indonesia)", hq: "Jakarta, Indonesia", website: "https://www.jawaban.com", category: "media_ministry" },
  { name: "Solusi.fm", hq: "Indonesia", website: "https://www.solusi.fm", category: "media_ministry" },
  { name: "Nafiri Gabriel TV", hq: "Indonesia", website: "https://www.nafirigabriel.tv", category: "media_ministry" },
  { name: "Metanoia Indonesia", hq: "Indonesia", website: "https://metanoia.id", category: "ministry" },
  { name: "Yayasan Pelayanan Doa Indonesia", hq: "Indonesia", website: "https://www.ypdi.org", category: "ministry" },

  // Africa-based ministries
  { name: "Christ Embassy (LoveWorld)", hq: "Lagos, Nigeria", website: "https://www.christembassy.org", category: "media_ministry" },
  { name: "Winners Chapel (David Oyedepo)", hq: "Ota, Nigeria", website: "https://www.faithtabernacle.org.ng", category: "media_ministry" },
  { name: "Redeemed Christian Church of God", hq: "Lagos, Nigeria", website: "https://www.rccg.org", category: "church_network" },
  { name: "Daystar Christian Centre", hq: "Lagos, Nigeria", website: "https://www.daystarng.org", category: "media_ministry" },
  { name: "Mount Zion Faith Ministries", hq: "Ile-Ife, Nigeria", website: "https://www.mountzionfilms.org", category: "media_ministry" },
  { name: "Emmanuel TV (TB Joshua)", hq: "Lagos, Nigeria", website: "https://www.emmanuel.tv", category: "media_ministry" },

  // Asia-based ministries
  { name: "Jesus Calls (Paul Dhinakaran)", hq: "Chennai, India", website: "https://www.jesuscalls.org", category: "media_ministry" },
  { name: "Divine Retreat Centre", hq: "Kerala, India", website: "https://www.dfrm.org", category: "ministry" },
  { name: "Eagle Broadcasting (Philippines)", hq: "Manila, Philippines", website: "https://www.eaglebroadcasting.com.ph", category: "media_ministry" },
  { name: "Jesus is Lord Church", hq: "Manila, Philippines", website: "https://www.jilworldwide.org", category: "church_network" },
  { name: "City Harvest Church", hq: "Singapore", website: "https://www.chc.org.sg", category: "church_network" },
  { name: "New Creation Church", hq: "Singapore", website: "https://www.newcreation.org.sg", category: "church_network" },
  { name: "CGNTV (Christian Global Network TV)", hq: "Seoul, South Korea", website: "https://www.cgntv.net", category: "media_ministry" },

  // Europe / Other
  { name: "UCB (United Christian Broadcasters)", hq: "Stoke-on-Trent, UK", website: "https://www.ucb.co.uk", category: "media_ministry" },
  { name: "Premier Christian Radio", hq: "London, UK", website: "https://www.premierchristianradio.com", category: "media_ministry" },
  { name: "GOD TV", hq: "UK / USA", website: "https://www.god.tv", category: "media_ministry" },
  { name: "SAT-7", hq: "Cyprus", website: "https://www.sat7.org", category: "media_ministry" },
  { name: "Trans World Radio", hq: "Cary, USA", website: "https://www.twr.org", category: "media_ministry" },
  { name: "FEBC (Far East Broadcasting Company)", hq: "La Mirada, USA", website: "https://www.febc.org", category: "media_ministry" },

  // Latin America
  { name: "Enlace TV", hq: "San Jose, Costa Rica", website: "https://www.enlace.org", category: "media_ministry" },
  { name: "TBN Enlace", hq: "Costa Rica", website: "https://www.tbnenlace.tv", category: "media_ministry" },
];

// Country offices to search for each major ministry
const GLOBAL_MINISTRY_BRANCHES = [
  "CBN", "TBN", "Cru", "World Vision", "Compassion International",
  "Billy Graham", "Focus on the Family", "Samaritan's Purse",
  "FEBC", "Trans World Radio", "Gospel for Asia",
];

const COUNTRIES_TO_SEARCH = [
  "Indonesia", "Philippines", "India", "Nigeria", "Kenya",
  "Ghana", "South Africa", "Uganda", "Brazil", "Mexico",
  "South Korea", "Singapore", "Malaysia", "Thailand",
  "Australia", "UK", "Canada", "Germany", "Netherlands",
];

// ─── Helpers ──────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractEmails(html) {
  if (!html) return [];
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(emailRegex) || [];
  return [...new Set(matches.filter(email => {
    const lower = email.toLowerCase();
    return !lower.includes("example.com") && !lower.includes("sentry") &&
           !lower.includes("webpack") && !lower.includes(".png") &&
           !lower.includes(".jpg") && !lower.includes(".css") &&
           !lower.includes(".js") && !lower.includes("@2x") &&
           !lower.endsWith(".woff") && !lower.endsWith(".svg") &&
           lower.length < 60;
  }))];
}

async function scrapeWebsite(url) {
  if (!url) return { emails: [], phones: [] };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!response.ok) return { emails: [], phones: [] };
    const html = await response.text();
    let emails = extractEmails(html);

    // Try contact page
    if (emails.length === 0) {
      for (const p of ["/contact", "/contact-us", "/about", "/about-us", "/connect", "/reach-us", "/prayer"]) {
        try {
          const baseUrl = new URL(url);
          const c = new AbortController();
          const t = setTimeout(() => c.abort(), 8000);
          const r = await fetch(`${baseUrl.origin}${p}`, {
            signal: c.signal,
            headers: { "User-Agent": "Mozilla/5.0" },
            redirect: "follow",
          });
          clearTimeout(t);
          if (r.ok) {
            const h = await r.text();
            emails = [...new Set([...emails, ...extractEmails(h)])];
            if (emails.length > 0) break;
          }
        } catch (e) { /* skip */ }
        await sleep(500);
      }
    }
    return { emails };
  } catch (err) {
    return { emails: [] };
  }
}

async function searchPlaces(query, city) {
  try {
    const url = "https://places.googleapis.com/v1/places:searchText";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating",
      },
      body: JSON.stringify({ textQuery: `${query} in ${city}`, maxResultCount: 20 }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.places || [];
  } catch (err) {
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const countryFilter = args.find(a => a.startsWith("--country="))?.split("=")[1] || null;
  const isCustomSearch = args.includes("--search");

  console.log("\n🔍 RTS Ministry Scraper");
  console.log("   Specialized for Christian Media Ministries\n");

  const allLeads = [];
  const seen = new Set(); // dedup by website

  // ── Phase 1: Scrape Known Ministries ────────────────────────
  console.log("═══════════════════════════════════════════");
  console.log("📋 Phase 1: Scraping Known Ministries");
  console.log("═══════════════════════════════════════════\n");

  let ministriesToScrape = KNOWN_MINISTRIES;
  if (countryFilter) {
    ministriesToScrape = KNOWN_MINISTRIES.filter(m =>
      m.hq.toLowerCase().includes(countryFilter.toLowerCase())
    );
    console.log(`   Filtered to: ${countryFilter} (${ministriesToScrape.length} ministries)\n`);
  }

  for (let i = 0; i < ministriesToScrape.length; i++) {
    const ministry = ministriesToScrape[i];
    process.stdout.write(`   [${i + 1}/${ministriesToScrape.length}] ${ministry.name.substring(0, 45)}...`);

    const scraped = await scrapeWebsite(ministry.website);
    const bestEmail = scraped.emails[0] || "";

    allLeads.push({
      name: ministry.name,
      church: ministry.name,
      city: ministry.hq,
      email: bestEmail,
      whatsapp: "",
      website: ministry.website,
      category: ministry.category,
      source: "known_database",
      allEmails: scraped.emails.join("; "),
    });

    if (!seen.has(ministry.website)) seen.add(ministry.website);

    if (bestEmail) {
      console.log(` ✅ ${bestEmail}`);
    } else {
      console.log(` ⚠️  no email found`);
    }

    await sleep(1500);
  }

  // ── Phase 2: Search for Country-Specific Branches ───────────
  console.log("\n═══════════════════════════════════════════");
  console.log("🌍 Phase 2: Finding Country-Specific Offices");
  console.log("═══════════════════════════════════════════\n");

  const countries = countryFilter ? [countryFilter] : COUNTRIES_TO_SEARCH.slice(0, 5); // limit to 5 for speed

  for (const country of countries) {
    console.log(`\n🏳️  ${country}:`);

    for (const ministry of GLOBAL_MINISTRY_BRANCHES) {
      const query = `${ministry} ${country}`;
      process.stdout.write(`   🔎 "${query}"...`);

      const places = await searchPlaces(ministry, country);

      for (const place of places) {
        const website = place.websiteUri || "";
        if (seen.has(website)) continue;
        seen.add(website);

        const name = place.displayName?.text || "";
        const phone = place.internationalPhoneNumber || place.nationalPhoneNumber || "";

        let email = "";
        if (website) {
          const scraped = await scrapeWebsite(website);
          email = scraped.emails[0] || "";
          await sleep(1000);
        }

        allLeads.push({
          name: `${name}`,
          church: name,
          city: `${place.formattedAddress || country}`,
          email: email,
          whatsapp: phone.replace(/[\s\-()]/g, ""),
          website: website,
          category: "country_office",
          source: "google_places",
          allEmails: email,
        });
      }

      if (places.length > 0) {
        console.log(` ${places.length} found`);
      } else {
        console.log(` -`);
      }

      await sleep(1500);
    }
  }

  // ── Phase 3: Search for Prayer/Counseling Ministries ────────
  console.log("\n═══════════════════════════════════════════");
  console.log("🙏 Phase 3: Prayer & Counseling Ministries");
  console.log("═══════════════════════════════════════════\n");

  const prayerQueries = [
    "prayer ministry",
    "counseling ministry",
    "pelayanan doa",
    "christian counseling center",
    "prayer hotline",
  ];

  const prayerCountries = countryFilter ? [countryFilter] : ["Indonesia", "Nigeria", "Philippines"];

  for (const country of prayerCountries) {
    for (const q of prayerQueries) {
      process.stdout.write(`   🔎 "${q}" in ${country}...`);

      const places = await searchPlaces(q, country);
      let newCount = 0;

      for (const place of places) {
        const website = place.websiteUri || "";
        if (website && seen.has(website)) continue;
        if (website) seen.add(website);

        const name = place.displayName?.text || "";
        const phone = place.internationalPhoneNumber || place.nationalPhoneNumber || "";

        let email = "";
        if (website) {
          const scraped = await scrapeWebsite(website);
          email = scraped.emails[0] || "";
          await sleep(1000);
        }

        allLeads.push({
          name: `Team ${name}`,
          church: name,
          city: place.formattedAddress || country,
          email: email,
          whatsapp: phone.replace(/[\s\-()]/g, ""),
          website: website,
          category: "prayer_ministry",
          source: "google_places",
          allEmails: email,
        });
        newCount++;
      }

      console.log(` ${newCount} new`);
      await sleep(1500);
    }
  }

  // ─── Generate CSV ───────────────────────────────────────────

  const validLeads = allLeads.filter(l => l.email || l.whatsapp);
  const dateStr = new Date().toISOString().split("T")[0];

  // Campaign CSV
  const campaignCsv = "name,church,city,email,whatsapp\n" +
    validLeads.map(l =>
      `"${l.name}","${l.church}","${l.city}","${l.email}","${l.whatsapp}"`
    ).join("\n");
  const campaignFile = `ministries_campaign_${dateStr}.csv`;
  fs.writeFileSync(campaignFile, campaignCsv);

  // Full CSV
  const fullCsv = "name,church,city,email,whatsapp,website,category,source,all_emails\n" +
    allLeads.map(l =>
      `"${l.name}","${l.church}","${l.city}","${l.email}","${l.whatsapp}","${l.website}","${l.category}","${l.source}","${l.allEmails}"`
    ).join("\n");
  const fullFile = `ministries_full_${dateStr}.csv`;
  fs.writeFileSync(fullFile, fullCsv);

  // ─── Summary ────────────────────────────────────────────────

  const withEmail = allLeads.filter(l => l.email).length;
  const withPhone = allLeads.filter(l => l.whatsapp).length;
  const byCategory = {};
  allLeads.forEach(l => {
    byCategory[l.category] = (byCategory[l.category] || 0) + 1;
  });

  console.log("\n" + "═".repeat(50));
  console.log("📊 MINISTRY SCRAPING RESULTS");
  console.log("═".repeat(50));
  console.log(`   Total ministries found:  ${allLeads.length}`);
  console.log(`   With email:              ${withEmail}`);
  console.log(`   With phone:              ${withPhone}`);
  console.log(`   Valid leads (for CSV):    ${validLeads.length}`);
  console.log("");
  console.log("   By category:");
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`     ${cat}: ${count}`);
  });
  console.log("");
  console.log(`📄 Campaign CSV: ${campaignFile}`);
  console.log(`   → Upload to Campaign Manager`);
  console.log(`📄 Full data:    ${fullFile}`);
  console.log("");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
