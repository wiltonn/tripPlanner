import Link from "next/link";

/* ── Data ── */

const VALUE_PROPS = [
  {
    title: "Routes that make sense",
    desc: "Multi-day itineraries with real driving times, scenic alternatives, and segment-by-segment ETAs.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    title: "Offline by default",
    desc: "Download maps and routes before you leave. Navigate canyons, coastlines, and countryside — no signal needed.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
  {
    title: "Budget in view",
    desc: "Track costs as plans evolve. See totals per day, per category — no surprises at the end.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    num: "01",
    title: "Set the window",
    desc: "Pick your dates and who's coming along.",
  },
  {
    num: "02",
    title: "Drop your pins",
    desc: "Add stops, lodging, and the places you can't miss.",
  },
  {
    num: "03",
    title: "See it all on a map",
    desc: "Get a real itinerary — adjust, rearrange, and go.",
  },
];

const FAQS = [
  {
    q: "Is it free?",
    a: "Yes. Core trip planning features are free with no subscription required.",
  },
  {
    q: "Does it work on mobile?",
    a: "The web app is fully responsive, and a native mobile app with offline maps is on the way.",
  },
  {
    q: "Can I export my plan?",
    a: "Share your itinerary or export route details for offline use.",
  },
  {
    q: "How do logins work?",
    a: "Sign in with email and password, or use a magic link — no password needed.",
  },
];

/* ── Page ── */

export default function LandingPage() {
  return (
    <div className="landing">
      {/* ── Nav ── */}
      <nav className="landing-nav">
        <span className="landing-logo">TripPlanner</span>
        <div className="landing-nav-actions">
          <Link href="/login" className="landing-nav-link">
            Sign in
          </Link>
          <Link href="/login?tab=signup" className="landing-nav-cta">
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div
          className="landing-hero-bg"
          style={{ backgroundImage: "url('/images/sea-hero.jpg')" }}
        />
        <div className="landing-hero-overlay" />
        {/* Grain texture */}
        <div className="landing-grain" />

        <div className="landing-hero-content">
          <p className="landing-hero-eyebrow anim-fade-up anim-d1">
            Multi-day trip planner
          </p>
          <h1 className="landing-hero-heading anim-fade-up anim-d2">
            Plan the trip.
            <br />
            <em>Keep the vibe.</em>
          </h1>
          <p className="landing-hero-sub anim-fade-up anim-d3">
            Turn rough ideas into a day-by-day itinerary with
            real&nbsp;routes, real&nbsp;times, and&nbsp;a&nbsp;map
            that&nbsp;works&nbsp;offline.
          </p>
          <div className="landing-hero-actions anim-fade-up anim-d4">
            <Link href="/login?tab=signup" className="btn-primary">
              Start planning
            </Link>
            <Link href="/login" className="btn-ghost">
              Sign in
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="landing-scroll-hint anim-fade-up anim-d5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ── Value Props ── */}
      <section className="landing-section">
        <div className="landing-container">
          <p className="landing-section-eyebrow">Why TripPlanner</p>
          <h2 className="landing-section-heading">
            Everything you need,<br />nothing you don&rsquo;t.
          </h2>
          <div className="landing-cards">
            {VALUE_PROPS.map((vp, i) => (
              <div key={vp.title} className="landing-card" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="landing-card-icon">{vp.icon}</div>
                <h3 className="landing-card-title">{vp.title}</h3>
                <p className="landing-card-desc">{vp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Seascape Divider ── */}
      <section className="landing-divider">
        <div
          className="landing-divider-bg"
          style={{ backgroundImage: "url('/images/sea-2.jpg')" }}
        />
        <div className="landing-divider-overlay" />
        <div className="landing-grain" />
        <p className="landing-divider-quote">
          &ldquo;Finally a trip planner that doesn&rsquo;t feel like a spreadsheet.&rdquo;
        </p>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-section landing-section--dark">
        <div className="landing-container">
          <p className="landing-section-eyebrow">How it works</p>
          <h2 className="landing-section-heading">
            Three steps.<br />No spreadsheets.
          </h2>
          <div className="landing-steps">
            {STEPS.map((s) => (
              <div key={s.num} className="landing-step">
                <span className="landing-step-num">{s.num}</span>
                <div className="landing-step-line" aria-hidden />
                <h3 className="landing-step-title">{s.title}</h3>
                <p className="landing-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="landing-section">
        <div className="landing-container landing-container--narrow">
          <p className="landing-section-eyebrow">FAQ</p>
          <h2 className="landing-section-heading">
            Common questions
          </h2>
          <div className="landing-faqs">
            {FAQS.map((faq) => (
              <details key={faq.q} className="landing-faq">
                <summary className="landing-faq-q">
                  <span>{faq.q}</span>
                  <svg className="landing-faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="landing-faq-a">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-cta">
        <div className="landing-grain" />
        <p className="landing-cta-eyebrow">Ready?</p>
        <h2 className="landing-cta-heading">
          Your next trip<br />starts here.
        </h2>
        <Link href="/login?tab=signup" className="btn-primary btn-primary--lg">
          Get started free
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span>&copy; {new Date().getFullYear()} TripPlanner</span>
        <div className="landing-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </div>
  );
}
