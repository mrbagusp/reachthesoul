import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || "AIzaSyBKM1xMcb57AQznRFcLyb1KoPl3gM-edC4";

export async function POST(req: NextRequest) {
  try {
    const { query, city } = await req.json();

    if (!query || !city) {
      return NextResponse.json({ error: "query and city required" }, { status: 400 });
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({
        textQuery: `${query} in ${city}`,
        maxResultCount: 20,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Google API error: ${response.status}`, detail: err }, { status: 500 });
    }

    const data = await response.json();
    const places = (data.places || []).map((p: any) => ({
      id: p.id,
      name: p.displayName?.text || "Unknown",
      address: p.formattedAddress || "",
      phone: p.internationalPhoneNumber || p.nationalPhoneNumber || "",
      website: p.websiteUri || "",
      rating: p.rating || 0,
      reviews: p.userRatingCount || 0,
    }));

    return NextResponse.json({ places, total: places.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
