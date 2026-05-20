import { NextRequest, NextResponse } from "next/server";

// ─── Paddle Billing — Checkout Session Creator ─────────────────────
// Creates a Paddle checkout transaction via their API and returns
// the checkout URL for client-side redirect.

const PADDLE_API_KEY = process.env.PADDLE_API_KEY ?? "";
const PADDLE_ENV = process.env.NEXT_PUBLIC_PADDLE_ENV ?? "sandbox";
const PADDLE_API_URL =
  PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

// Map plan tiers → Paddle price IDs (set in .env)
const PRICE_MAP: Record<string, string> = {
  starter: process.env.PADDLE_PRICE_STARTER ?? "",
  growth: process.env.PADDLE_PRICE_GROWTH ?? "",
  enterprise: process.env.PADDLE_PRICE_ENTERPRISE ?? "",
};

export async function POST(req: NextRequest) {
  try {
    const { plan, orgId, userEmail, userName } = await req.json();

    if (!plan || !orgId) {
      return NextResponse.json({ error: "plan and orgId required" }, { status: 400 });
    }

    const priceId = PRICE_MAP[plan];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!PADDLE_API_KEY) {
      return NextResponse.json({ error: "Paddle not configured" }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://reachthesoul.org";

    // Build the transaction body for Paddle Billing API
    // See: https://developer.paddle.com/api-reference/transactions/create-transaction
    const txBody: Record<string, any> = {
      items: [{ price_id: priceId, quantity: 1 }],
      custom_data: {
        org_id: orgId,
        plan_tier: plan,
      },
      checkout: {
        url: `${baseUrl}/dashboard/billing?upgraded=${plan}`,
      },
    };

    // Pre-fill customer email if available
    if (userEmail) {
      txBody.customer = { email: userEmail };
    }

    const response = await fetch(`${PADDLE_API_URL}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(txBody),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[Paddle Checkout] Error:", response.status, errData);
      return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
    }

    const data = await response.json();
    const txId = data.data?.id;

    if (!txId) {
      console.error("[Paddle Checkout] No transaction ID in response:", data);
      return NextResponse.json({ error: "No transaction ID returned" }, { status: 500 });
    }

    // For overlay checkout, we return the transaction ID
    // The client-side Paddle.js will open checkout with this ID
    // Also construct a direct checkout URL as fallback
    const checkoutUrl =
      PADDLE_ENV === "production"
        ? `https://checkout.paddle.com/checkout/custom/${txId}`
        : `https://sandbox-checkout.paddle.com/checkout/custom/${txId}`;

    return NextResponse.json({
      transactionId: txId,
      checkoutUrl,
    });
  } catch (err) {
    console.error("[Paddle Checkout] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
