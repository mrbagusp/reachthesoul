// app/privacy/page.tsx
// Renders at reachthesoul.org/privacy
// Reflects actual stack: Vercel + Firestore + third-party AI (OpenAI/Anthropic).
// Replace every {/* GANTI: ... */} placeholder before publishing. Template, not legal advice.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ReachTheSoul",
  description:
    "How ReachTheSoul collects, uses, processes, and protects the personal and prayer-related information entrusted to us.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm italic text-gray-500">Effective Date: July 7, 2026</p>
      </header>

      <div className="prose prose-gray max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-a:text-indigo-600">
        <h2>1. Introduction</h2>
        <p>
          ReachTheSoul (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the ReachTheSoul
          platform, which provides prayer support and soul-care tools for churches, ministries, and
          individuals (the &quot;Service&quot;). We take the privacy of the deeply personal
          information entrusted to us seriously. This Privacy Policy explains what information we
          collect, how we use it, how it is processed and protected, and the choices you have.
        </p>
        {/* GANTI: konfirmasi nama entitas legal & negara pendaftaran */}

        <h2>2. Information We Collect</h2>
        <h3>2.1 Information You Provide</h3>
        <ul>
          <li>Account information: name, email address, church or organization name, and password.</li>
          <li>
            Prayer and care content: prayer requests, notes, reflections, and counseling-related
            messages you or your respondents submit.
          </li>
          <li>
            Respondent information: when your organization interacts with people seeking prayer or
            care, their names, contact details, and message content may be stored.
          </li>
          <li>Communications: messages you send to us for support or feedback.</li>
        </ul>
        {/* GANTI: prayer/counseling content bisa jadi "special category data" (GDPR).
            Konfirmasi lawful basis / consent dengan pengacara. */}
        <h3>2.2 Information Collected Automatically</h3>
        <ul>
          <li>Usage data: pages visited, features used, and time spent on the Service.</li>
          <li>Device and log data: IP address, browser type, and device identifiers.</li>
          <li>Cookies and similar technologies (see Section 8).</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, operate, and maintain the Service.</li>
          <li>Generate AI-assisted first responses to incoming prayer and care messages.</li>
          <li>
            Detect messages that may indicate crisis or self-harm, so they can be escalated to your
            human team.
          </li>
          <li>Communicate with you about your account and updates.</li>
          <li>Improve and secure the Service.</li>
          <li>Comply with legal obligations.</li>
        </ul>

        <h2>4. AI Processing and Third-Party Sub-Processors</h2>
        <p>
          The Service uses artificial intelligence to generate initial responses to prayer and
          counseling messages and to help detect messages that may need urgent human attention. To
          do this, the content of messages is sent to third-party AI providers (for example, OpenAI
          and/or Anthropic) that process the content on our behalf to generate a response.
        </p>
        <p>
          These AI providers act as our sub-processors. We do not use your prayer or counseling
          content to train our own AI models, and we rely on providers whose terms restrict the use
          of submitted content for training their models. We will not use your content to train AI
          models without first updating this Policy and, where required, obtaining your consent.
        </p>
        {/* GANTI/VERIFY: sebutkan penyedia AI persis yang dipakai. Pastikan pakai API settings
            yang tidak memakai data untuk training. Pertimbangkan menandatangani DPA dengan tiap penyedia. */}

        <h2>5. How We Share Your Information</h2>
        <p>
          We do not sell your personal information. We share information only in these limited
          circumstances:
        </p>
        <ul>
          <li>
            With infrastructure and service providers that operate the Service — including Vercel
            (hosting), Google Firestore (database), and the AI providers described in Section 4 —
            under confidentiality and data-processing obligations.
          </li>
          <li>
            With messaging platforms you connect (such as WhatsApp, Instagram, Facebook, or TikTok),
            solely to send and receive the messages you route through them.
          </li>
          <li>
            With your church or organization administrator, where you interact with the Service
            through them and per their configured settings.
          </li>
          <li>
            When required by law, or to protect the rights, safety, and security of users and the
            public.
          </li>
          <li>
            In connection with a merger, acquisition, or sale of assets, with notice to you.
          </li>
        </ul>
        {/* GANTI: perjelas apakah church admin bisa membaca prayer request pribadi anggota. */}

        <h2>6. Data Isolation</h2>
        <p>
          Each organization&apos;s data is logically isolated so that one church or ministry cannot
          access another organization&apos;s data. Access is controlled through authentication and
          access rules.
        </p>
        {/* GANTI/VERIFY: pastikan Firestore Security Rules benar-benar menegakkan isolasi per-organisasi. Uji ini. */}

        <h2>7. Data Security</h2>
        <p>
          We rely on industry-standard infrastructure to protect your information. Data is encrypted
          in transit (via HTTPS) and encrypted at rest by our database provider. We restrict
          internal access to personal information to those who need it to operate the Service.
        </p>
        <p>
          Please note that no method of transmission or storage is completely secure. While our
          infrastructure encrypts stored data, authorized personnel with administrative access may
          be able to view content in order to operate and support the Service. We do not provide
          end-to-end encryption, and you should not assume that submitted content is invisible to
          all staff.
        </p>

        <h2>8. Cookies</h2>
        <p>
          We use cookies and similar technologies to operate the Service, remember your preferences,
          and understand usage. You can control cookies through your browser settings.
        </p>

        <h2>9. Data Retention</h2>
        <p>
          We retain your information for as long as your account is active or as needed to provide
          the Service, then delete or anonymize it, unless a longer retention period is required by
          law.
        </p>
        {/* GANTI: sebutkan periode retensi konkret. */}

        <h2>10. Your Rights and Choices</h2>
        <p>
          Depending on your location, you may have the right to access, correct, delete, or export
          your personal information, and to withdraw consent. To exercise these rights, contact us at
          the address in Section 12.
        </p>
        {/* GANTI: jika ada pengguna EU/UK (GDPR) atau California (CCPA), rinci hak & timeline. */}

        <h2>11. Children&apos;s Privacy</h2>
        <p>
          The Service is not directed to children under 13 (or the minimum age required in your
          jurisdiction), and we do not knowingly collect their personal information without
          verifiable parental consent.
        </p>
        {/* GANTI: jika youth ministry jadi use case, perlu alur parental consent & COPPA. */}

        <h2>12. Contact Us</h2>
        <p>If you have questions about this Privacy Policy or your information, contact us at:</p>
        <p>
          ReachTheSoul
          <br />
          Email: privacy@reachthesoul.org {/* GANTI: pastikan inbox ini dipantau */}
          <br />
          Address: {/* GANTI: alamat surat terdaftar */}
        </p>

        <h2>13. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the updated version with
          a new effective date and, where appropriate, notify you.
        </p>
      </div>
    </main>
  );
}