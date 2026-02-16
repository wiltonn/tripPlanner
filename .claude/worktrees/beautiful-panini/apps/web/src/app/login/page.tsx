import { Suspense } from "react";
import Link from "next/link";
import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: "Sign in | TripPlanner",
};

export default function LoginPage() {
  return (
    <div className="landing" style={{ minHeight: "100vh" }}>
      {/* Background image + overlay — same treatment as landing hero */}
      <div
        className="landing-hero-bg"
        style={{ backgroundImage: "url('/images/sea-hero.jpg')" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(12,10,9,0.4) 0%, transparent 70%), linear-gradient(to bottom, rgba(12,10,9,0.7) 0%, rgba(12,10,9,0.85) 50%, var(--land-bg) 100%)",
          zIndex: 1,
        }}
      />
      <div className="landing-grain" />

      {/* Nav — reuses landing nav pattern */}
      <nav className="landing-nav">
        <Link href="/" className="landing-logo" style={{ textDecoration: "none" }}>
          TripPlanner
        </Link>
        <div className="landing-nav-actions">
          <Link href="/login" className="landing-nav-link">
            Sign in
          </Link>
          <Link href="/login?tab=signup" className="landing-nav-cta">
            Get started
          </Link>
        </div>
      </nav>

      {/* Auth card */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "96px 24px 48px",
        }}
      >
        <div className="login-card">
          <h1 className="login-heading">Welcome back</h1>
          <p className="login-subheading">
            Sign in to continue planning your trip.
          </p>
          <Suspense
            fallback={
              <div
                style={{
                  height: 256,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--land-text-dim)",
                }}
              >
                Loading...
              </div>
            }
          >
            <AuthForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
