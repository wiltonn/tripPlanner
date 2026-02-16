"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Tab = "signin" | "signup";

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("tab") === "signup") {
      setTab("signup");
    }
  }, [searchParams]);

  const supabase = createClient();

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (tab === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email to confirm your account.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    }
    setLoading(false);
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
    } else {
      setMagicLinkSent(true);
      setMessage("Magic link sent! Check your inbox.");
    }
    setLoading(false);
  }

  if (magicLinkSent) {
    return (
      <div style={{ textAlign: "center" }}>
        <div className="login-icon-circle">
          <svg className="login-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="login-magic-title">Check your email</h2>
        <p className="login-magic-desc">
          We sent a magic link to <span style={{ color: "var(--land-text)", fontWeight: 500 }}>{email}</span>
        </p>
        <button
          onClick={() => { setMagicLinkSent(false); setMessage(null); }}
          className="login-link-btn"
        >
          Use a different method
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="login-tabs">
        <button
          onClick={() => { setTab("signin"); setError(null); setMessage(null); }}
          className={`login-tab ${tab === "signin" ? "login-tab--active" : ""}`}
        >
          Sign in
        </button>
        <button
          onClick={() => { setTab("signup"); setError(null); setMessage(null); }}
          className={`login-tab ${tab === "signup" ? "login-tab--active" : ""}`}
        >
          Create account
        </button>
      </div>

      {/* Error / Message */}
      {error && (
        <div className="login-alert login-alert--error">{error}</div>
      )}
      {message && (
        <div className="login-alert login-alert--success">{message}</div>
      )}

      {/* Form */}
      <form onSubmit={handleEmailPassword} className="login-form">
        <div>
          <label htmlFor="email" className="login-label">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="login-input"
          />
        </div>
        <div>
          <label htmlFor="password" className="login-label">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tab === "signup" ? "At least 6 characters" : "Your password"}
            className="login-input"
          />
        </div>

        <button type="submit" disabled={loading} className="login-submit">
          {loading ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <svg style={{ animation: "spin 1s linear infinite", width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {tab === "signup" ? "Creating account..." : "Signing in..."}
            </span>
          ) : tab === "signup" ? (
            "Create account"
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="login-divider">
        <div className="login-divider-line" />
        <span className="login-divider-text">or</span>
        <div className="login-divider-line" />
      </div>

      {/* Magic Link */}
      <button
        onClick={handleMagicLink}
        disabled={loading}
        className="login-magic-btn"
      >
        Send magic link
      </button>
    </div>
  );
}
