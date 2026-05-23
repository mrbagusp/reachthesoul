import { NextRequest, NextResponse } from "next/server";

// ─── Dial Status Handler ─────────────────────────────────────────────
// Called by Twilio after the <Dial> verb completes.
// If the counselor didn't answer, redirect to voicemail.

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const dialCallStatus = params.DialCallStatus ?? "";
    const callSid = params.CallSid ?? "";

    console.log(`[Dial Status] CallSid=${callSid} DialCallStatus=${dialCallStatus}`);

    // If counselor answered, call is handled — just hang up gracefully
    if (dialCallStatus === "completed") {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Counselor didn't answer — offer voicemail
    const webhookBase = process.env.NEXT_PUBLIC_APP_URL ?? "https://reachthesoul.org";

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Our counselor is currently unavailable. Please leave a message after the tone, and we will return your call as soon as possible.</Say>
  <Record maxLength="120" action="${webhookBase}/api/calls/webhook" transcribe="false" playBeep="true"/>
  <Say voice="Polly.Joanna">Thank you for your message. Goodbye.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("[Dial Status] Error:", err);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're sorry, something went wrong. Please try again later.</Say>
  <Hangup/>
</Response>`;
    return new NextResponse(fallback, {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
