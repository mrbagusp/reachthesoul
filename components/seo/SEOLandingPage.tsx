"use client";
import { useEffect } from "react";

// ─── Shared SEO Landing Page Component ───────────────────────────────
// Used by all keyword-specific landing pages for consistent branding
// while allowing unique content per page.

interface SEOFeature {
  icon: string;
  title: string;
  desc: string;
}

interface SEOTestimonial {
  quote: string;
  role: string;
}

interface SEOLandingProps {
  // Hero
  badge: string;
  headline: string;     // supports <em> tags
  subheadline: string;  // supports <em> tags
  heroStats: { value: string; label: string }[];

  // Problem
  problemTitle: string;
  problemBody: string;  // raw HTML paragraphs
  problemStats: { stat: string; desc: string }[];

  // Solution
  solutionTitle: string;
  solutionBody: string;
  features: SEOFeature[];

  // How it works
  steps: { num: string; title: string; desc: string }[];

  // Why RTS
  whyTitle: string;
  whyPoints: { title: string; desc: string }[];

  // CTA
  ctaTitle: string;
  ctaDesc: string;

  // SEO
  schemaType: string;
  schemaName: string;
  schemaDesc: string;
}

export function SEOLandingPage(props: SEOLandingProps) {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.1 });
    document.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": props.schemaType,
    name: props.schemaName,
    description: props.schemaDesc,
    url: typeof window !== "undefined" ? window.location.href : "https://reachthesoul.org",
    provider: {
      "@type": "Organization",
      name: "ReachTheSoul",
      url: "https://reachthesoul.org",
    },
    applicationCategory: "Church Software",
    operatingSystem: "Web-based",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier available. Paid plans from $29/month.",
    },
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson) }}
      />
      <style dangerouslySetInnerHTML={{ __html: SEO_STYLES }} />
      <div className="seo-landing">
        {/* Nav */}
        <nav className="seo-nav">
          <div className="seo-nav-inner">
            <a href="/" className="seo-logo">
              <div className="seo-logo-icon"><span>RTS</span></div>
              <span className="seo-logo-text">ReachTheSoul</span>
            </a>
            <div className="seo-nav-links">
              <a href="/login" className="seo-btn-ghost">Sign In</a>
              <a href="/register" className="seo-btn-primary">Start Free</a>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="seo-hero">
          <div className="seo-container">
            <div className="seo-badge">{props.badge}</div>
            <h1 dangerouslySetInnerHTML={{ __html: props.headline }} />
            <p className="seo-sub" dangerouslySetInnerHTML={{ __html: props.subheadline }} />
            <div className="seo-hero-cta">
              <a href="/register" className="seo-btn-primary seo-btn-lg">Start Free — No Credit Card →</a>
              <a href="/" className="seo-btn-ghost seo-btn-lg">See Full Platform</a>
            </div>
            <div className="seo-hero-stats">
              {props.heroStats.map((s, i) => (
                <div key={i} className="seo-stat">
                  <div className="seo-stat-value">{s.value}</div>
                  <div className="seo-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="seo-section seo-problem">
          <div className="seo-container fade-up">
            <h2>{props.problemTitle}</h2>
            <div className="seo-prose" dangerouslySetInnerHTML={{ __html: props.problemBody }} />
            <div className="seo-problem-stats">
              {props.problemStats.map((s, i) => (
                <div key={i} className="seo-problem-stat">
                  <div className="seo-problem-stat-num">{s.stat}</div>
                  <div className="seo-problem-stat-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solution */}
        <section className="seo-section seo-solution">
          <div className="seo-container fade-up">
            <h2>{props.solutionTitle}</h2>
            <p className="seo-lead" dangerouslySetInnerHTML={{ __html: props.solutionBody }} />
            <div className="seo-features">
              {props.features.map((f, i) => (
                <div key={i} className="seo-feature-card">
                  <div className="seo-feature-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="seo-section seo-steps">
          <div className="seo-container fade-up">
            <h2>How it works</h2>
            <div className="seo-steps-grid">
              {props.steps.map((s, i) => (
                <div key={i} className="seo-step">
                  <div className="seo-step-num">{s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why RTS */}
        <section className="seo-section seo-why">
          <div className="seo-container fade-up">
            <h2>{props.whyTitle}</h2>
            <div className="seo-why-grid">
              {props.whyPoints.map((p, i) => (
                <div key={i} className="seo-why-card">
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="seo-section seo-cta">
          <div className="seo-container fade-up">
            <h2>{props.ctaTitle}</h2>
            <p>{props.ctaDesc}</p>
            <a href="/register" className="seo-btn-primary seo-btn-lg">Start Free — No Credit Card →</a>
            <p className="seo-cta-sub">Free plan includes 1 user, 50 respondents. No credit card required.</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="seo-footer">
          <div className="seo-container">
            <div className="seo-footer-inner">
              <div>
                <div className="seo-logo" style={{ marginBottom: 8 }}>
                  <div className="seo-logo-icon"><span>RTS</span></div>
                  <span className="seo-logo-text">ReachTheSoul</span>
                </div>
                <p>Helping churches and ministries respond 24/7 in a minute — without losing the human touch.</p>
              </div>
              <div className="seo-footer-links">
                <a href="/">Home</a>
                <a href="/register">Start Free</a>
                <a href="/login">Sign In</a>
                <a href="mailto:hello@reachthesoul.org">Contact</a>
              </div>
            </div>
            <p className="seo-footer-copy">© {new Date().getFullYear()} ReachTheSoul. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const SEO_STYLES = `
  .seo-landing { font-family: 'DM Sans', sans-serif; color: #1a1a2e; background: #fff; }
  .seo-landing h1, .seo-landing h2 { font-family: 'DM Serif Display', serif; }
  .seo-landing em { color: #2DD4BF; font-style: normal; }
  .seo-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

  /* Nav */
  .seo-nav { position: sticky; top: 0; z-index: 100; background: #0F1B2D; padding: 16px 0; }
  .seo-nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; }
  .seo-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .seo-logo-icon { width: 32px; height: 32px; background: #1A2942; border-radius: 8px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
  .seo-logo-icon::before { content: ''; position: absolute; left: 5px; top: 25%; bottom: 25%; width: 2px; background: #2DD4BF; border-radius: 2px; }
  .seo-logo-icon span { font-size: 9px; font-weight: 700; color: #fff; letter-spacing: 0.5px; margin-left: 1px; }
  .seo-logo-text { font-family: 'DM Serif Display', serif; font-size: 17px; color: #fff; }
  .seo-nav-links { display: flex; gap: 10px; align-items: center; }
  .seo-btn-ghost { padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #fff; text-decoration: none; border: 1px solid rgba(255,255,255,0.2); }
  .seo-btn-ghost:hover { background: rgba(255,255,255,0.1); }
  .seo-btn-primary { padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #0F1B2D; background: #2DD4BF; text-decoration: none; display: inline-block; }
  .seo-btn-primary:hover { background: #26b8a6; }
  .seo-btn-lg { padding: 14px 32px; font-size: 15px; border-radius: 12px; }

  /* Hero */
  .seo-hero { background: linear-gradient(135deg, #0F1B2D, #162238); padding: 80px 0 60px; text-align: center; }
  .seo-badge { display: inline-block; background: rgba(45,212,191,0.1); border: 1px solid rgba(45,212,191,0.3); color: #2DD4BF; padding: 6px 16px; border-radius: 100px; font-size: 12px; font-weight: 600; margin-bottom: 24px; }
  .seo-hero h1 { font-size: clamp(28px, 5vw, 48px); color: #fff; line-height: 1.2; margin-bottom: 20px; }
  .seo-sub { font-size: 16px; color: rgba(255,255,255,0.6); max-width: 600px; margin: 0 auto 32px; line-height: 1.7; }
  .seo-hero-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 48px; }
  .seo-hero-stats { display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; }
  .seo-stat-value { font-family: 'DM Serif Display', serif; font-size: 32px; color: #2DD4BF; }
  .seo-stat-label { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px; }

  /* Sections */
  .seo-section { padding: 80px 0; }
  .seo-section h2 { font-size: clamp(24px, 4vw, 36px); margin-bottom: 20px; }
  .seo-lead { font-size: 16px; color: #555; max-width: 700px; line-height: 1.8; margin-bottom: 40px; }
  .seo-prose { font-size: 15px; color: #444; line-height: 1.8; max-width: 700px; }
  .seo-prose p { margin-bottom: 16px; }
  .seo-prose strong { color: #0F1B2D; }

  /* Problem */
  .seo-problem { background: #f8f9fb; }
  .seo-problem-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-top: 40px; }
  .seo-problem-stat { background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #eee; }
  .seo-problem-stat-num { font-family: 'DM Serif Display', serif; font-size: 36px; color: #DC2626; margin-bottom: 8px; }
  .seo-problem-stat-desc { font-size: 13px; color: #666; line-height: 1.5; }

  /* Features */
  .seo-features { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
  .seo-feature-card { background: #f8f9fb; border-radius: 12px; padding: 28px; border: 1px solid #eee; }
  .seo-feature-icon { font-size: 28px; margin-bottom: 12px; }
  .seo-feature-card h3 { font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #0F1B2D; }
  .seo-feature-card p { font-size: 13px; color: #666; line-height: 1.6; }

  /* Steps */
  .seo-steps { background: #0F1B2D; color: #fff; }
  .seo-steps h2 { color: #fff; }
  .seo-steps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 32px; margin-top: 40px; }
  .seo-step-num { font-family: 'DM Serif Display', serif; font-size: 48px; color: #2DD4BF; margin-bottom: 12px; }
  .seo-step h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
  .seo-step p { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6; }

  /* Why */
  .seo-why { background: #f8f9fb; }
  .seo-why-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 32px; }
  .seo-why-card { background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #eee; }
  .seo-why-card h3 { font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 8px; color: #0F1B2D; }
  .seo-why-card p { font-size: 13px; color: #666; line-height: 1.6; }

  /* CTA */
  .seo-cta { text-align: center; background: linear-gradient(135deg, #0F1B2D, #162238); color: #fff; padding: 80px 0; }
  .seo-cta h2 { color: #fff; font-size: clamp(24px, 4vw, 36px); margin-bottom: 16px; }
  .seo-cta > div > p:first-of-type { color: rgba(255,255,255,0.6); font-size: 16px; margin-bottom: 32px; }
  .seo-cta-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 16px; }

  /* Footer */
  .seo-footer { background: #0a1120; padding: 40px 0 24px; color: rgba(255,255,255,0.5); font-size: 13px; }
  .seo-footer-inner { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 32px; margin-bottom: 24px; }
  .seo-footer-inner p { max-width: 400px; line-height: 1.6; margin: 0; }
  .seo-footer-links { display: flex; gap: 20px; flex-wrap: wrap; }
  .seo-footer-links a { color: rgba(255,255,255,0.5); text-decoration: none; }
  .seo-footer-links a:hover { color: #2DD4BF; }
  .seo-footer-copy { font-size: 11px; color: rgba(255,255,255,0.3); text-align: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; }

  /* Animations */
  .fade-up { opacity: 0; transform: translateY(20px); transition: opacity 0.6s, transform 0.6s; }
  .fade-up.visible { opacity: 1; transform: translateY(0); }

  @media (max-width: 768px) {
    .seo-hero { padding: 60px 0 40px; }
    .seo-hero-stats { gap: 24px; }
    .seo-section { padding: 60px 0; }
    .seo-btn-lg { padding: 12px 24px; font-size: 14px; }
  }
`;
