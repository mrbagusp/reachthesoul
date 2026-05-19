"use client";

export default function RefundPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif", color: "#1a1a2e", lineHeight: 1.7 }}>
      <a href="/" style={{ color: "#2563EB", textDecoration: "none", fontSize: 14 }}>← Back to ReachTheSoul</a>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>Refund Policy</h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 32 }}>Last updated: May 19, 2026</p>

      <p>At ReachTheSoul, we want you to be completely satisfied with our Service. This Refund Policy outlines when and how you can request a refund for your subscription.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>1. 14-Day Money-Back Guarantee</h2>
      <p>If you are not satisfied with the Service, you may request a full refund within 14 days of your initial subscription purchase. No questions asked. This applies to your first subscription payment only.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>2. Subsequent Billing Cycles</h2>
      <p>Refunds for subsequent monthly or annual billing cycles are generally not available. However, we may consider refund requests on a case-by-case basis in the following circumstances:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li>Extended service outage or unavailability that significantly impacted your use of the Service</li>
        <li>A billing error resulting in an incorrect charge</li>
        <li>Duplicate charges</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>3. How to Request a Refund</h2>
      <p>To request a refund, please contact us at <a href="mailto:hello@reachthesoul.org" style={{ color: "#2563EB" }}>hello@reachthesoul.org</a> with the following information:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li>Your account email address</li>
        <li>Organization name</li>
        <li>Reason for the refund request</li>
        <li>Date of the charge</li>
      </ul>
      <p>We will review your request and respond within 5 business days.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>4. Refund Processing</h2>
      <p>Approved refunds will be processed through your original payment method. Please allow 5–10 business days for the refund to appear on your statement, depending on your bank or payment provider.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>5. Cancellation</h2>
      <p>You may cancel your subscription at any time from your account settings or by contacting us. Upon cancellation:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li>You will retain access to the Service until the end of your current billing period</li>
        <li>No further charges will be applied after cancellation</li>
        <li>Your data will be retained for 30 days after the billing period ends, during which you may request a data export</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>6. Free Plan</h2>
      <p>The free plan does not involve any charges and therefore is not subject to this Refund Policy. You may downgrade to the free plan at any time.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>7. Contact Us</h2>
      <p>If you have any questions about this Refund Policy, please contact us at:</p>
      <p style={{ marginTop: 8 }}>
        <strong>ReachTheSoul</strong><br />
        Email: <a href="mailto:hello@reachthesoul.org" style={{ color: "#2563EB" }}>hello@reachthesoul.org</a><br />
        Website: reachthesoul.org
      </p>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #e5e7eb", fontSize: 13, color: "#9ca3af" }}>
        © {new Date().getFullYear()} ReachTheSoul. All rights reserved.
      </div>
    </div>
  );
}
