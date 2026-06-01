'use client'

import Link from 'next/link'
import React from 'react'

interface FAQ {
  question: string
  answer: string
}

interface BlogArticleProps {
  title: string
  children: React.ReactNode
  faqs?: FAQ[]
  canonical: string
  date: string
}

export default function BlogArticle({ title, children, faqs, canonical, date }: BlogArticleProps) {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    url: canonical,
    datePublished: date,
    publisher: { '@type': 'Organization', name: 'ReachTheSoul', url: 'https://reachthesoul.org' },
    author: { '@type': 'Organization', name: 'ReachTheSoul' },
  }

  const faqSchema = faqs && faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  } : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <main className="min-h-screen bg-white">
        <nav className="border-b border-gray-100 px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold text-gray-900">ReachTheSoul</Link>
            <div className="flex gap-4 text-sm">
              <Link href="/blog" className="text-gray-600 hover:text-gray-900">Blog</Link>
              <Link href="https://reachthesoul.org/register" className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700">Get Started Free</Link>
            </div>
          </div>
        </nav>

        <article className="max-w-3xl mx-auto px-4 py-12">
          <div className="text-sm text-gray-500 mb-8">
            <Link href="/" className="hover:text-gray-700">Home</Link>
            <span className="mx-2">&#8250;</span>
            <Link href="/blog" className="hover:text-gray-700">Blog</Link>
          </div>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            {children}
          </div>

          <div className="mt-16 p-8 bg-blue-50 rounded-xl text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to make sure no one falls through the cracks?</h3>
            <p className="text-gray-600 mb-6">AI handles the first response. Your team handles the rest. Nobody gets forgotten.</p>
            <Link href="https://reachthesoul.org/register" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition">Start Free</Link>
          </div>
        </article>

        <footer className="border-t border-gray-100 px-4 py-8 mt-12">
          <div className="max-w-3xl mx-auto text-center text-sm text-gray-500">
            <p>ReachTheSoul - Where Every Soul Finds Care</p>
            <p className="mt-1"><Link href="mailto:hello@reachthesoul.org" className="hover:text-gray-700">hello@reachthesoul.org</Link></p>
          </div>
        </footer>
      </main>
    </>
  )
}

/* Reusable styled elements for article content */
export function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-3xl font-bold text-gray-900 leading-tight">{children}</h1>
}
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-semibold text-gray-900 mt-12 mb-2">{children}</h2>
}
export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-1">{children}</h3>
}
export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-700 leading-relaxed">{children}</p>
}
export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="text-gray-900 font-semibold">{children}</strong>
}
export function Divider() {
  return <hr className="my-10 border-gray-200" />
}
export function Blockquote({ children }: { children: React.ReactNode }) {
  return <blockquote className="border-l-4 border-blue-500 bg-blue-50 py-3 px-5 rounded-r-md text-gray-700 italic">{children}</blockquote>
}
export function CTA({ href, children }: { href: string; children: React.ReactNode }) {
  return <p><Link href={href} className="text-blue-600 hover:underline font-medium">{children}</Link></p>
}
