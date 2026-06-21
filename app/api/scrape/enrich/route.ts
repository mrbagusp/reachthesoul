import { NextRequest, NextResponse } from "next/server";

function extractEmails(html: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(emailRegex) || [];
  return [...new Set(matches.filter(email => {
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

export async function POST(req: NextRequest) {
  try {
    const { website } = await req.json();

    if (!website) {
      return NextResponse.json({ emails: [] });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let emails: string[] = [];

    try {
      const response = await fetch(website, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (response.ok) {
        const html = await response.text();
        emails = extractEmails(html);
      }
    } catch (e) {
      clearTimeout(timeout);
    }

    // Try contact page if no email found
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
            const h = await r.text();
            emails = [...new Set([...emails, ...extractEmails(h)])];
            if (emails.length > 0) break;
          }
        } catch (e) {}
      }
    }

    return NextResponse.json({ emails });
  } catch (err: any) {
    return NextResponse.json({ emails: [], error: err.message });
  }
}
