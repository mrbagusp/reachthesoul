import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion — ReachTheSoul",
  description:
    "How to request deletion of your data from ReachTheSoul, operated by Blessing Media Global.",
};

const UPDATED = "July 19, 2026"; // update when you change this page

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-slate-800">
      <h1 className="text-3xl font-bold">Data Deletion</h1>
      <p className="mt-1 text-sm text-slate-500">Last updated: {UPDATED}</p>

      <p className="mt-6 leading-relaxed">
        ReachTheSoul (&quot;RTS&quot;), operated by <strong>Blessing Media Global</strong>, respects
        your right to have your personal data deleted. This page explains what data we hold, how to
        request its deletion, and what happens after you ask.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">What data we may hold</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
          <li>
            Messages you sent to a ministry through a connected channel (Facebook Messenger, Instagram
            Direct, WhatsApp), which may include prayer requests or personal details.
          </li>
          <li>Basic profile information from the messaging platform (name, profile picture, platform user ID).</li>
          <li>For ministry account holders: account and contact details and connected-account information.</li>
        </ul>
        <p className="mt-3 leading-relaxed">
          All data is stored in Google Firebase / Firestore in the Singapore region.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">How to request deletion</h2>

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="text-lg font-semibold">1. If you contacted a ministry through RTS</h3>
          <p className="mt-2 leading-relaxed">
            Reply to that ministry, or email us directly, asking for your data to be deleted. Please
            include the name or handle you used and the ministry/page you contacted, so we can locate
            your records.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="text-lg font-semibold">2. Email us directly</h3>
          <p className="mt-2 leading-relaxed">
            Send a request to{" "}
            <a
              className="text-blue-600 hover:underline"
              href="mailto:privacy@reachthesoul.org?subject=Data%20Deletion%20Request"
            >
              privacy@reachthesoul.org
            </a>{" "}
            with the subject line <strong>&quot;Data Deletion Request.&quot;</strong> Include:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
            <li>The messaging platform you used (Facebook, Instagram, or WhatsApp)</li>
            <li>The name/username or profile you messaged from</li>
            <li>The ministry or page you contacted</li>
          </ul>
        </div>

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="text-lg font-semibold">3. Ministry account holders</h3>
          <p className="mt-2 leading-relaxed">
            If you are a ministry using RTS and want your organization&apos;s data deleted, contact us
            at the email above. When you stop using the service, your data is retained for one (1)
            month and then permanently deleted automatically (see below).
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">What happens next</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
          <li>We will confirm your request and verify enough details to locate the correct data.</li>
          <li>
            We will delete the requested personal data from our active systems, and it will be removed
            from backups in the normal backup-rotation cycle.
          </li>
          <li>
            <strong>For ministries that stop using RTS:</strong> data is retained for one (1) month
            after the account ends, to allow for reactivation or export, and is then permanently
            deleted.
          </li>
          <li>
            We will confirm to you when deletion is complete, and respond within the time required by
            applicable law.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Data handled by the ministry</h2>
        <p className="mt-2 leading-relaxed">
          Some data you shared may also be held directly by the ministry you contacted (for example,
          in their own follow-up records). For data they control independently, you may also need to
          contact that ministry directly. We will help direct your request where we can.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="mt-2 leading-relaxed text-slate-600">
          <strong>Blessing Media Global</strong> (operator of ReachTheSoul)
          <br />
          D Java Residence Blok C2 No. 16, Kabupaten Bekasi, Jawa Barat 17836, Indonesia
          <br />
          Email:{" "}
          <a className="text-blue-600 hover:underline" href="mailto:privacy@reachthesoul.org">
            privacy@reachthesoul.org
          </a>
        </p>
      </section>
    </main>
  );
}