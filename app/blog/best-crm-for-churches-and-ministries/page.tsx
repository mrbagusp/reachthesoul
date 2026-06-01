import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Church Ministry Resources | ReachTheSoul Blog',
  description: 'Practical guides for churches and ministries on pastoral care, counseling follow-up, WhatsApp outreach, prayer CRM, and ministry management systems.',
  alternates: { canonical: 'https://reachthesoul.org/blog' },
  openGraph: {
    title: 'Church Ministry Resources | ReachTheSoul Blog',
    description: 'Practical guides for churches and ministries on pastoral care, counseling follow-up, WhatsApp outreach, and ministry CRM systems.',
    url: 'https://reachthesoul.org/blog',
    siteName: 'ReachTheSoul',
  },
}

const posts = [
  {
    slug: 'why-every-church-needs-a-crm',
    title: "Why Every Church Needs a CRM (And Most Pastors Don't Realize It Until Someone Falls Through the Cracks)",
    description: 'Your church has a prayer and counseling ministry. But how many messages are sitting unanswered right now? Here is why a CRM changes everything.',
  },
  {
    slug: 'what-happens-when-church-has-no-follow-up-system',
    title: 'What Happens When Your Church Has No Follow-Up System (The Silent Crisis Most Ministries Don\'t See)',
    description: 'The dangerous part is not the messages you ignore. It is the ones you never knew were there. Here is the real cost of running ministry without a follow-up system.',
  },
  {
    slug: 'best-crm-for-churches-and-ministries',
    title: 'The Best CRM for Churches and Ministries in 2026 (What Most Software Gets Wrong)',
    description: 'HubSpot felt like a sales tool. Spreadsheets fell apart. WhatsApp groups became chaos. Here is what church leaders actually need.',
  },
  {
    slug: 'how-to-manage-counseling-follow-up-for-ministry',
    title: "How to Manage Counseling Follow-Up for Ministry (Without It All Living in One Pastor's Head)",
    description: 'The hardest part of pastoral counseling is not the session. It is knowing what happens after.',
  },
  {
    slug: 'whatsapp-crm-for-church-outreach',
    title: 'WhatsApp for Church Outreach: Why a Group Chat Is Not Enough (And What to Use Instead)',
    description: 'Your church WhatsApp number is the first place people reach out when they are hurting. Is anyone watching it at every hour?',
  },
]

export default function BlogIndex() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900">ReachTheSoul</Link>
          <Link href="https://reachthesoul.org/register" className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700">Get Started Free</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Ministry Resources</h1>
          <p className="text-lg text-gray-600">Practical guides for churches and ministries building better systems for prayer, counseling, and pastoral care.</p>
        </div>

        <div className="space-y-10">
          {posts.map((post) => (
            <article key={post.slug} className="group border-b border-gray-100 pb-10 last:border-0">
              <Link href={`/blog/${post.slug}`}>
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition leading-snug">{post.title}</h2>
              </Link>
              <p className="text-gray-600 mt-2 leading-relaxed">{post.description}</p>
              <Link href={`/blog/${post.slug}`} className="inline-block mt-3 text-sm text-blue-600 hover:underline">Read more &#8594;</Link>
            </article>
          ))}
        </div>

        <div className="mt-16 p-8 bg-blue-50 rounded-xl text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Every conversation. Every soul. All in one place.</h3>
          <p className="text-gray-600 mb-6">ReachTheSoul helps churches respond to prayer and counseling requests 24/7 without losing the human touch.</p>
          <Link href="https://reachthesoul.org/register" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition">Start Free</Link>
        </div>
      </div>
    </main>
  )
}
