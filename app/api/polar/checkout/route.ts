import { NextRequest, NextResponse } from "next/server";

const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN ?? "";
const POLAR_SERVER = process.env.POLAR_SANDBOX === "true" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";

const PRODUCT_MAP: Record<string, string> = {
  starter: process.env.POLAR_PRODUCT_STARTER ?? "",
  growth: process.env.POLAR_PRODUCT_GROWTH ?? "",
  enterprise: process.env.POLAR_PRODUCT_ENTERPRISE ?? "",
};

export async function POST(req: NextRequest) {
  try {
    const { plan, orgId, userEmail, userName } = await req.json();

    if (!plan || !orgId) {
      return NextResponse.json({ error: "plan and orgId required" }, { status: 400 });
    }

    const productId = PRODUCT_MAP[plan];
    if (!productId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!POLAR_ACCESS_TOKEN) {
      return NextResponse.json({ error: "Polar not configured" }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://reachthesoul.org";

    const response = await fetch(`${POLAR_SERVER}/v1/checkouts/custom`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${POLAR_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: productId,
        success_url: `${baseUrl}/dashboard/billing?upgraded=${plan}`,
        customer_email: userEmail || undefined,
        customer_name: userName || undefined,
        metadata: {
          org_id: orgId,
          plan_tier: plan,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[Polar Checkout] Error:", response.status, errData);
      return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
    }

    const data = await response.json();
    const checkoutUrl = data.url;

    if (!checkoutUrl) {
      console.error("[Polar Checkout] No URL in response:", data);
      return NextResponse.json({ error: "No checkout URL returned" }, { status: 500 });
    }

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("[Polar Checkout] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
