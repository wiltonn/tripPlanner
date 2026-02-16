import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase-server";
import SignOutButton from "@/components/auth/SignOutButton";

export const metadata: Metadata = {
  title: "My Trips | TripPlanner",
};

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: plans } = await supabase
    .from("trip_plans")
    .select("*")
    .order("updated_at", { ascending: false });

  const tripPlans = plans ?? [];

  // Gate: no plans yet → go straight to trip creation
  if (tripPlans.length === 0) {
    redirect("/trips/new");
  }

  return (
    <div className="landing" style={{ minHeight: "100vh" }}>
      {/* Nav */}
      <nav className="landing-nav">
        <Link href="/" className="landing-logo" style={{ textDecoration: "none" }}>
          TripPlanner
        </Link>
        <div className="landing-nav-actions">
          <span style={{ fontSize: "13px", color: "var(--land-text-muted)" }}>
            {user.email}
          </span>
          <SignOutButton />
          <Link href="/trips/new" className="landing-nav-cta">
            New Trip
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div style={{ paddingTop: "100px", maxWidth: "720px", margin: "0 auto", padding: "100px 24px 60px" }}>
        <p className="landing-section-eyebrow" style={{ textAlign: "left", marginBottom: "8px" }}>
          Dashboard
        </p>
        <h1
          className="landing-section-heading"
          style={{ textAlign: "left", marginBottom: "12px", fontSize: "clamp(1.8rem, 4vw, 2.6rem)" }}
        >
          Your Trips
        </h1>
        <p style={{ fontSize: "14px", color: "var(--land-text-muted)", marginBottom: "40px" }}>
          {tripPlans.length} {tripPlans.length === 1 ? "plan" : "plans"}
        </p>

        <div className="dashboard-plan-list">
          {tripPlans.map((plan) => {
            const bases: { name?: string }[] = Array.isArray(plan.bases) ? plan.bases : [];
            const baseNames = bases
              .map((b) => b.name)
              .filter(Boolean)
              .join(" \u2192 ");

            return (
              <Link
                key={plan.id}
                href={`/map/${plan.id}`}
                className="dashboard-plan-card"
              >
                <div className="dashboard-plan-card-top">
                  <h3 className="dashboard-plan-card-title">{plan.title}</h3>
                  <span className={`dashboard-status-badge dashboard-status-badge--${plan.status}`}>
                    {plan.status}
                  </span>
                </div>
                <div className="dashboard-plan-card-meta">
                  <span>{plan.nights} {plan.nights === 1 ? "night" : "nights"}</span>
                  <span>{plan.travelers}</span>
                  {baseNames && <span>{baseNames}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
