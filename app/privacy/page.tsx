"use client";

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif", color: "#1a1a2e", lineHeight: 1.7 }}>
      <a href="/" style={{ color: "#2563EB", textDecoration: "none", fontSize: 14 }}>← Back to ReachTheSoul</a>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 32 }}>Last updated: May 19, 2026</p>

      <p>ReachTheSoul (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at reachthesoul.org (the &quot;Service&quot;).</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>1. Information We Collect</h2>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 20 }}>1.1 Account Information</h3>
      <p>When you create an account, we collect your name, email address, organization name, and role. This information is necessary to provide and personalize the Service.</p>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 20 }}>1.2 Respondent Data</h3>
      <p>As part of the Service, your organization may input respondent information including names, phone numbers, email addresses, conversation histories, prayer requests, counseling notes, and follow-up records. This data is stored on behalf of your organization and is owned by your organization.</p>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 20 }}>1.3 Usage Data</h3>
      <p>We automatically collect information about how you interact with the Service, including pages visited, features used, timestamps, and device information. This data helps us improve the Service.</p>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 20 }}>1.4 Payment Information</h3>
      <p>Payment processing is handled by our third-party payment processor (acting as Merchant of Record). We do not directly store your credit card numbers or banking information. Our payment processor may collect billing details as necessary to process your subscription.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li>Provide, maintain, and improve the Service</li>
        <li>Process subscriptions and payments</li>
        <li>Send service-related notifications and updates</li>
        <li>Provide customer support</li>
        <li>Power AI-assisted features (conversation suggestions, response generation)</li>
        <li>Analyze usage patterns to improve user experience</li>
        <li>Ensure security and prevent fraud</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>3. AI Data Processing</h2>
      <p>Our AI features process conversation data to generate response suggestions and assist counselors. AI processing occurs in real-time and we do not use your respondent data to train general AI models. Conversation data processed by AI is handled in accordance with the same security standards as all other data in the Service.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>4. Data Storage and Security</h2>
      <p>Your data is stored securely using Google Firebase infrastructure with encryption at rest and in transit. We implement industry-standard security measures including:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li>Encryption of data in transit (TLS/SSL) and at rest</li>
        <li>Role-based access controls within the platform</li>
        <li>Regular security monitoring and updates</li>
        <li>Multi-tenant data isolation ensuring organizations can only access their own data</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>5. Data Sharing and Disclosure</h2>
      <p>We do not sell, rent, or trade your personal information or respondent data. We may share data only in the following limited circumstances:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li><strong>Service Providers:</strong> With trusted third-party providers who assist in operating the Service (e.g., hosting, payment processing, AI providers), under strict confidentiality agreements</li>
        <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process</li>
        <li><strong>Safety:</strong> To protect the rights, safety, or property of ReachTheSoul, our users, or the public</li>
        <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, with prior notice to users</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>6. Third-Party Integrations</h2>
      <p>The Service integrates with third-party messaging platforms (WhatsApp, Instagram, Facebook). When you connect these platforms, messages received through them are processed and stored within the Service. Each third-party platform has its own privacy policy governing how they handle data on their end. We encourage you to review those policies.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>7. Data Retention</h2>
      <p>We retain your data for as long as your account is active or as needed to provide the Service. Upon account termination, we retain data for 30 days to allow for data export requests. After this period, data may be permanently deleted. Aggregated, anonymized data may be retained indefinitely for analytics and service improvement purposes.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>8. Your Rights</h2>
      <p>Depending on your jurisdiction, you may have the following rights regarding your data:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
        <li><strong>Correction:</strong> Request correction of inaccurate data</li>
        <li><strong>Deletion:</strong> Request deletion of your data</li>
        <li><strong>Export:</strong> Request a portable copy of your data</li>
        <li><strong>Objection:</strong> Object to certain processing of your data</li>
      </ul>
      <p>To exercise any of these rights, please contact us at hello@reachthesoul.org. We will respond to your request within 30 days.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>9. Cookies</h2>
      <p>We use essential cookies necessary for the operation of the Service (authentication, session management). We do not use third-party advertising cookies. Analytics cookies may be used to understand how users interact with the Service and are governed by our analytics provider&apos;s privacy policy.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>10. Children&apos;s Privacy</h2>
      <p>The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child under 18, we will take steps to delete such information promptly.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>11. International Data Transfers</h2>
      <p>Your data may be processed and stored in locations outside your country of residence, including the United States (where our infrastructure providers operate). By using the Service, you consent to such transfers. We ensure appropriate safeguards are in place for international data transfers.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>12. Organization Responsibilities</h2>
      <p>As an organization using the Service to manage respondent data, you are responsible for:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li>Obtaining appropriate consent from respondents before inputting their data</li>
        <li>Ensuring your use of the Service complies with applicable privacy laws in your jurisdiction</li>
        <li>Managing access permissions within your organization appropriately</li>
        <li>Informing respondents about how their data is being managed</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>13. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email or through the Service. The &quot;Last updated&quot; date at the top of this page indicates when the policy was last revised.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>14. Contact Us</h2>
      <p>If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:</p>
      <p style={{ marginTop: 8 }}>
        <strong>ReachTheSoul</strong><br />
        Email: hello@reachthesoul.org<br />
        Website: reachthesoul.org
      </p>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #e5e7eb", fontSize: 13, color: "#9ca3af" }}>
        © {new Date().getFullYear()} ReachTheSoul. All rights reserved.
      </div>
    </div>
  );
}
