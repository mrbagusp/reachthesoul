import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — ReachTheSoul",
  description:
    "Privacy Policy for ReachTheSoul, operated by Blessing Media Global. How we collect, use, store, and delete data.",
};

const UPDATED = "July 19, 2026"; // update when you change this policy

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-slate-800">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-1 text-sm text-slate-500">Last updated: {UPDATED}</p>

      <p className="mt-6 leading-relaxed">
        ReachTheSoul (&quot;RTS&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a response and
        follow-up platform that helps Christian ministries receive and respond to prayer requests,
        spiritual questions, counseling needs, and decisions of faith. ReachTheSoul is owned and
        operated by <strong>Blessing Media Global</strong>, a legally registered entity in Indonesia
        (&quot;the data controller&quot;).
      </p>
      <p className="mt-4 leading-relaxed">
        This policy explains what information we collect, why, how we protect it, where it is stored,
        and the choices you have. Because many people contact ministries during vulnerable moments, we
        treat the messages we handle with particular care.
      </p>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        This policy reflects our current practices and is provided for transparency. It is not legal
        advice.
      </div>

      <Section title="1. Who we are">
        <p>
          <strong>Product:</strong> ReachTheSoul (reachthesoul.org)
          <br />
          <strong>Operated by:</strong> Blessing Media Global
          <br />
          <strong>Registered address:</strong> D Java Residence Blok C2 No. 16, Kabupaten Bekasi, Jawa
          Barat 17836, Indonesia
          <br />
          <strong>Contact:</strong>{" "}
          <a className="text-blue-600 hover:underline" href="mailto:privacy@reachthesoul.org">
            privacy@reachthesoul.org
          </a>
        </p>
        <p className="mt-3">
          Ministries that use RTS to manage their own audiences are <strong>independent
          controllers</strong> of the messages their audiences send them. For that content, RTS acts
          as a <strong>processor</strong> on the ministry&apos;s behalf.
        </p>
      </Section>

      <Section title="2. Information we collect">
        <p>
          <strong>a) Message and conversation data.</strong> When someone contacts a ministry through
          a connected channel (e.g. Facebook Messenger, Instagram Direct, WhatsApp), we receive and
          process the content of those messages, which may include prayer requests, personal
          circumstances, and spiritual or emotional disclosures.
        </p>
        <p className="mt-3">
          <strong>b) Sender profile data.</strong> Basic profile information provided by the messaging
          platform, such as name, profile picture, and a platform user ID, used to identify and
          respond to the person.
        </p>
        <p className="mt-3">
          <strong>c) Ministry account data.</strong> Information about ministry users of RTS: name,
          email, organization, connected pages/accounts, and access tokens needed to send and receive
          messages on the ministry&apos;s behalf.
        </p>
        <p className="mt-3">
          <strong>d) Technical data.</strong> Standard log data such as timestamps and system events
          needed to operate and secure the service.
        </p>
        <p className="mt-3">
          We do <strong>not</strong> seek to collect more than is necessary to route and respond to
          messages.
        </p>
      </Section>

      <Section title="3. How we use information">
        <p>
          We use the information to deliver incoming messages to the right ministry responders; enable
          timely, structured follow-up so no request is missed; provide an initial automated
          acknowledgement and route or prioritize messages (including flagging urgent situations for
          faster human attention); and maintain, secure, and improve the service.
        </p>
        <p className="mt-3">
          We do <strong>not</strong> sell personal data, and we do <strong>not</strong> use message
          content for advertising.
        </p>
      </Section>

      <Section title="4. Automated processing and human care">
        <p>
          RTS may use automated tools to acknowledge messages instantly and to help categorize and
          prioritize them (for example, distinguishing a general prayer request from an urgent
          situation). Automated responses are a first step only. The substantive spiritual and
          counseling care is provided by human responders from the ministry.
        </p>
        <p className="mt-3">
          <strong>RTS is not an emergency or crisis service.</strong> If someone is in immediate
          danger, they should contact local emergency services or a crisis hotline. Where a message
          indicates a possible crisis, our system is designed to encourage the person toward immediate
          help and to prioritize the message for human follow-up.
        </p>
      </Section>

      <Section title="5. How we share information">
        <p>
          We share information only as needed to operate the service: with the ministry the person
          contacted (their responders); with service providers/processors that power messaging
          channels and infrastructure — for example Meta (Facebook/Instagram), our WhatsApp provider,
          and Google Firebase/Firestore (hosting and database); and when legally required, to comply
          with applicable law or valid legal process.
        </p>
        <p className="mt-3">
          Where a third-party processor is in the data path, we require appropriate safeguards and
          confidentiality.
        </p>
      </Section>

      <Section title="6. Data storage, location, and security">
        <p>
          Message and account data are stored in <strong>Google Firebase / Firestore</strong>, in the{" "}
          <strong>Singapore</strong> region. Data is encrypted in transit and at rest (as provided by
          Google Cloud infrastructure). Access is restricted to authorized ministry responders and
          authorized RTS personnel. We apply reasonable technical and organizational measures to
          protect the data.
        </p>
        <p className="mt-3">
          Because RTS operates across countries, data submitted by users in various locations is
          stored on servers located in Singapore. By using the service, users understand that their
          data will be processed and stored there.
        </p>
      </Section>

      <Section title="7. Data retention">
        <p>
          We retain message and account data for as long as a ministry maintains an active account
          with RTS, in order to provide care and follow-up.
        </p>
        <p className="mt-3">
          <strong>
            When a ministry stops using the service (cancels or terminates their account), we retain
            their data for one (1) month, after which it is permanently deleted from our systems.
          </strong>{" "}
          This one-month window allows for reactivation, data export, or resolution of any outstanding
          matters before deletion.
        </p>
        <p className="mt-3">
          A person may also request deletion of their own data at any time — see Section 8 and our{" "}
          <a className="text-blue-600 hover:underline" href="/data-deletion">
            Data Deletion
          </a>{" "}
          page.
        </p>
      </Section>

      <Section title="8. Your rights and choices">
        <p>
          Depending on your location, you may have the right to access, correct, or delete your
          personal data, or to object to or restrict certain processing. To make a request about your
          own messages, contact the ministry you reached out to, or contact us at{" "}
          <a className="text-blue-600 hover:underline" href="mailto:privacy@reachthesoul.org">
            privacy@reachthesoul.org
          </a>{" "}
          and we will assist or route your request. To request deletion of data, see our{" "}
          <a className="text-blue-600 hover:underline" href="/data-deletion">
            Data Deletion
          </a>{" "}
          page. We will respond to requests within the time required by applicable law.
        </p>
      </Section>

      <Section title="9. Platform-specific note (Meta)">
        <p>
          When a ministry connects a Facebook Page or Instagram account, they authorize RTS to receive
          and respond to messages on their behalf using Meta&apos;s official APIs. RTS uses the
          permissions granted only to provide the messaging and follow-up features described here, in
          accordance with Meta&apos;s Platform Terms and Developer Policies. Access tokens are stored
          securely and used only for these purposes.
        </p>
      </Section>

      <Section title="10. Children">
        <p>
          RTS is intended to be used by ministries and adults. We do not knowingly seek personal data
          from children. If you believe a child&apos;s data has been shared with us, contact us so we
          can address it appropriately.
        </p>
      </Section>

      <Section title="11. Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be reflected by updating
          the &quot;Last updated&quot; date and, where appropriate, providing additional notice.
        </p>
      </Section>

      <Section title="12. Contact">
        <p className="text-slate-600">
          <strong>Blessing Media Global</strong> (operator of ReachTheSoul)
          <br />
          D Java Residence Blok C2 No. 16, Kabupaten Bekasi, Jawa Barat 17836, Indonesia
          <br />
          Email:{" "}
          <a className="text-blue-600 hover:underline" href="mailto:privacy@reachthesoul.org">
            privacy@reachthesoul.org
          </a>
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-2 leading-relaxed">{children}</div>
    </section>
  );
}