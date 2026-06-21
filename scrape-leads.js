#!/usr/bin/env node

/**
 * RTS Lead Scraper v2 — Google Places API + Website Email Extraction
 * 
 * Now supports --count=50 to automatically run multiple query variations
 * 
 * Usage:
 *   node scrape-leads.js "church" "Jakarta"                    → 20 results
 *   node scrape-leads.js "church" "Jakarta" --count=50         → ~50 results
 *   node scrape-leads.js "church" "Jakarta" --count=100        → ~100 results
 *   node scrape-leads.js "church" "Jakarta,Surabaya" --count=50
 */

const fs = require("fs");

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || "AIzaSyBKM1xMcb57AQznRFcLyb1KoPl3gM-edC4";
const DELAY_MS = 1500;

if (!API_KEY || API_KEY === "") {
  console.error("\nGOOGLE_PLACES_API_KEY not set!\n");
  process.exit(1);
}

const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const countArg = process.argv.find(a => a.startsWith("--count="));
const targetCount = countArg ? parseInt(countArg.split("=")[1]) : 20;

if (args.length < 2) {
  console.error("\nUsage: node scrape-leads.js <query> <cities> [--count=50]");
  console.error('  node scrape-leads.js "church" "Jakarta"');
  console.error('  node scrape-leads.js "church" "Jakarta" --count=50');
  console.error('  node scrape-leads.js "church" "Jakarta,Surabaya" --count=100\n');
  process.exit(1);
}

const searchQuery = args[0];
const cities = args[1].split(",").map(c => c.trim());

// Query variations to get more results
const QUERY_VARIATIONS = {
  "church": ["church", "gereja", "chapel", "cathedral", "christian church", "protestant church", "catholic church", "pentecostal church"],
  "gereja": ["gereja", "church", "gereja kristen", "gereja protestan", "gereja katolik", "gereja pantekosta"],
  "christian ministry": ["christian ministry", "ministry", "christian organization", "bible ministry"],
  "prayer ministry": ["prayer ministry", "prayer center", "pelayanan doa", "prayer hotline"],
  "default": null, // use as-is
};

// Sub-areas for major cities to get more granular results
const CITY_SUBAREAS = {
  "jakarta": ["Jakarta Selatan", "Jakarta Utara", "Jakarta Barat", "Jakarta Timur", "Jakarta Pusat", "Tangerang", "Bekasi"],
  "surabaya": ["Surabaya Timur", "Surabaya Barat", "Surabaya Selatan", "Surabaya Utara", "Surabaya Pusat"],
  "bandung": ["Bandung", "Bandung Barat", "Cimahi"],
  "medan": ["Medan", "Medan Kota", "Deli Serdang"],
  "lagos": ["Lagos Island", "Lagos Mainland", "Ikeja", "Lekki", "Victoria Island"],
  "nairobi": ["Nairobi", "Nairobi CBD", "Westlands Nairobi", "Karen Nairobi"],
  "manila": ["Manila", "Quezon City", "Makati", "Pasig"],
  "dallas": ["Dallas", "Fort Worth", "Plano", "Irving"],
};

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

async function searchPlaces(query, city) {
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({ textQuery: `${query} in ${city}`, maxResultCount: 20 }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.log(` API error: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.places || [];
  } catch (err) {
    return [];
  }
}

async function scrapeWebsite(url) {
  if (!url) return { emails: [] };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!response.ok) return { emails: [] };
    const html = await response.text();
    let emails = extractEmails(html);

    if (emails.length === 0) {
      for (const p of ["/contact", "/contact-us", "/about", "/about-us", "/connect"]) {
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
            emails = [...new Set([...emails, ...extractEmails(await r.text())])];
            if (emails.length > 0) break;
          }
        } catch (e) {}
        await sleep(500);
      }
    }
    return { emails };
  } catch (err) {
    return { emails: [] };
  }
}

async function main() {
  console.log("\n== RTS Lead Scraper v2 ==");
  console.log(`   Query: "${searchQuery}"`);
  console.log(`   Cities: ${cities.join(", ")}`);
  console.log(`   Target: ~${targetCount} results per city`);
  console.log("");

  const allLeads = [];
  const seenIds = new Set(); // dedup by place ID

  for (const city of cities) {
    console.log(`\n== ${city} ==`);

    // Determine how many queries we need
    const queriesNeeded = Math.ceil(targetCount / 20);

    // Build query list
    let queries = [];

    if (queriesNeeded <= 1) {
      // Simple: just one query
      queries.push({ query: searchQuery, area: city });
    } else {
      // Strategy 1: Use query variations
      const variations = QUERY_VARIATIONS[searchQuery.toLowerCase()] || [searchQuery];
      for (const v of variations) {
        queries.push({ query: v, area: city });
      }

      // Strategy 2: Use sub-areas if available
      const subareas = CITY_SUBAREAS[city.toLowerCase()];
      if (subareas && queries.length < queriesNeeded) {
        for (const area of subareas) {
          queries.push({ query: searchQuery, area: area });
        }
      }

      // Limit to needed count
      queries = queries.slice(0, queriesNeeded);
    }

    console.log(`   Running ${queries.length} queries to reach ~${targetCount} results...`);

    let cityCount = 0;

    for (const q of queries) {
      if (cityCount >= targetCount) break;

      process.stdout.write(`   >> "${q.query}" in ${q.area}...`);
      const places = await searchPlaces(q.query, q.area);

      let newCount = 0;
      for (const place of places) {
        // Dedup by place ID
        if (seenIds.has(place.id)) continue;
        seenIds.add(place.id);

        const name = place.displayName?.text || "Unknown";
        const address = place.formattedAddress || "";
        const phone = place.internationalPhoneNumber || place.nationalPhoneNumber || "";
        const website = place.websiteUri || "";
        const rating = place.rating || 0;
        const reviews = place.userRatingCount || 0;

        let email = "";
        if (website) {
          const scraped = await scrapeWebsite(website);
          email = scraped.emails[0] || "";
          await sleep(DELAY_MS);
        }

        allLeads.push({
          name: `Team ${name}`,
          church: name,
          city: city,
          email: email,
          whatsapp: phone.replace(/[\s\-()]/g, ""),
          website: website,
          address: address,
          rating: rating,
          reviews: reviews,
        });

        newCount++;
        cityCount++;
      }

      console.log(` ${newCount} new (total: ${cityCount})`);
      await sleep(DELAY_MS);
    }

    console.log(`   City total: ${cityCount} unique places`);
  }

  // Generate CSV
  const validLeads = allLeads.filter(l => l.email || l.whatsapp);
  const dateStr = new Date().toISOString().split("T")[0];
  const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "");

  const campaignCsv = "name,church,city,email,whatsapp\n" +
    validLeads.map(l =>
      `"${l.name}","${l.church}","${l.city}","${l.email}","${l.whatsapp}"`
    ).join("\n");
  const campaignFile = `leads_campaign_${dateStr}_${timeStr}.csv`;
  fs.writeFileSync(campaignFile, campaignCsv);

  const fullCsv = "name,church,city,email,whatsapp,website,address,rating,reviews\n" +
    allLeads.map(l =>
      `"${l.name}","${l.church}","${l.city}","${l.email}","${l.whatsapp}","${l.website}","${l.address}",${l.rating},${l.reviews}`
    ).join("\n");
  const fullFile = `leads_full_${dateStr}_${timeStr}.csv`;
  fs.writeFileSync(fullFile, fullCsv);

  // Summary
  const withEmail = allLeads.filter(l => l.email).length;
  const withPhone = allLeads.filter(l => l.whatsapp).length;

  console.log("\n==========================================");
  console.log("SCRAPING RESULTS");
  console.log("==========================================");
  console.log(`   Total places found:     ${allLeads.length}`);
  console.log(`   With email:             ${withEmail}`);
  console.log(`   With phone:             ${withPhone}`);
  console.log(`   Valid leads (for CSV):   ${validLeads.length}`);
  console.log("");
  console.log(`   Campaign CSV: ${campaignFile}`);
  console.log(`   Full data:    ${fullFile}`);
  console.log("");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});