"use client";

import { useState } from "react";

type Tab = "login" | "signup";

export default function AuthForm({
  initialTab = "login",
  callbackError,
}: {
  initialTab?: Tab;
  callbackError?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(callbackError ?? null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setError(null);
    setSignupSuccess(false);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
    } else {
      // Hard navigation to ensure cookies are picked up
      window.location.href = "/projects";
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
    } else {
      setSignupSuccess(true);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    fontFamily: "var(--font-dm-sans), sans-serif",
    color: "var(--klad-ink)",
    backgroundColor: "var(--klad-paper)",
    border: "1px solid var(--klad-paper3)",
    borderRadius: "6px",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "6px",
    fontSize: "11px",
    fontFamily: "var(--font-ibm-plex-mono), monospace",
    color: "var(--klad-ink2)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  if (signupSuccess) {
    return (
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            margin: "0 auto 16px",
            borderRadius: "50%",
            backgroundColor: "var(--klad-yellow)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}
        >
          ✓
        </div>
        <p
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--klad-ink)",
            fontFamily: "var(--font-dm-sans), sans-serif",
            marginBottom: "8px",
          }}
        >
          Check your email
        </p>
        <p
          style={{
            fontSize: "13px",
            color: "var(--klad-ink3)",
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          We sent a confirmation link to{" "}
          <span style={{ color: "var(--klad-ink)", fontWeight: 500 }}>
            {email}
          </span>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Tab toggle */}
      <div
        style={{
          display: "flex",
          marginBottom: "24px",
          borderBottom: "1px solid var(--klad-paper3)",
        }}
      >
        <button
          type="button"
          onClick={() => switchTab("login")}
          style={{
            flex: 1,
            padding: "10px 0",
            fontSize: "13px",
            fontFamily: "var(--font-dm-sans), sans-serif",
            fontWeight: activeTab === "login" ? 600 : 400,
            color:
              activeTab === "login"
                ? "var(--klad-ink)"
                : "var(--klad-ink3)",
            background: "none",
            border: "none",
            borderBottom:
              activeTab === "login"
                ? "2px solid var(--klad-ink)"
                : "2px solid transparent",
            cursor: "pointer",
            transition: "color 0.15s, border-color 0.15s",
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => switchTab("signup")}
          style={{
            flex: 1,
            padding: "10px 0",
            fontSize: "13px",
            fontFamily: "var(--font-dm-sans), sans-serif",
            fontWeight: activeTab === "signup" ? 600 : 400,
            color:
              activeTab === "signup"
                ? "var(--klad-ink)"
                : "var(--klad-ink3)",
            background: "none",
            border: "none",
            borderBottom:
              activeTab === "signup"
                ? "2px solid var(--klad-ink)"
                : "2px solid transparent",
            cursor: "pointer",
            transition: "color 0.15s, border-color 0.15s",
          }}
        >
          Create Account
        </button>
      </div>

      {/* Login form */}
      {activeTab === "login" && (
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label htmlFor="login-email" style={labelStyle}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--klad-ink2)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--klad-paper3)")
              }
            />
          </div>

          <div>
            <label htmlFor="login-password" style={labelStyle}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              style={inputStyle}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--klad-ink2)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--klad-paper3)")
              }
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: "12px",
                color: "#b91c1c",
                fontFamily: "var(--font-dm-sans), sans-serif",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "var(--font-dm-sans), sans-serif",
              color: "var(--klad-ink)",
              backgroundColor: "var(--klad-yellow)",
              border: "1px solid var(--klad-ink)",
              borderRadius: "6px",
              boxShadow: "3px 3px 0 var(--klad-ink)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading || !email || !password ? 0.6 : 1,
              transition: "box-shadow 0.1s, transform 0.1s",
            }}
            onMouseDown={(e) => {
              const btn = e.currentTarget;
              btn.style.boxShadow = "1px 1px 0 var(--klad-ink)";
              btn.style.transform = "translate(2px, 2px)";
            }}
            onMouseUp={(e) => {
              const btn = e.currentTarget;
              btn.style.boxShadow = "3px 3px 0 var(--klad-ink)";
              btn.style.transform = "translate(0, 0)";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget;
              btn.style.boxShadow = "3px 3px 0 var(--klad-ink)";
              btn.style.transform = "translate(0, 0)";
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      )}

      {/* Signup form */}
      {activeTab === "signup" && (
        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label htmlFor="signup-email" style={labelStyle}>
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--klad-ink2)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--klad-paper3)")
              }
            />
          </div>

          <div>
            <label htmlFor="signup-password" style={labelStyle}>
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              style={inputStyle}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--klad-ink2)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--klad-paper3)")
              }
            />
          </div>

          <div>
            <label htmlFor="signup-confirm" style={labelStyle}>
              Confirm Password
            </label>
            <input
              id="signup-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              required
              style={inputStyle}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--klad-ink2)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--klad-paper3)")
              }
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: "12px",
                color: "#b91c1c",
                fontFamily: "var(--font-dm-sans), sans-serif",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password || !confirmPassword}
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "var(--font-dm-sans), sans-serif",
              color: "var(--klad-ink)",
              backgroundColor: "var(--klad-yellow)",
              border: "1px solid var(--klad-ink)",
              borderRadius: "6px",
              boxShadow: "3px 3px 0 var(--klad-ink)",
              cursor: loading ? "not-allowed" : "pointer",
              opacity:
                loading || !email || !password || !confirmPassword ? 0.6 : 1,
              transition: "box-shadow 0.1s, transform 0.1s",
            }}
            onMouseDown={(e) => {
              const btn = e.currentTarget;
              btn.style.boxShadow = "1px 1px 0 var(--klad-ink)";
              btn.style.transform = "translate(2px, 2px)";
            }}
            onMouseUp={(e) => {
              const btn = e.currentTarget;
              btn.style.boxShadow = "3px 3px 0 var(--klad-ink)";
              btn.style.transform = "translate(0, 0)";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget;
              btn.style.boxShadow = "3px 3px 0 var(--klad-ink)";
              btn.style.transform = "translate(0, 0)";
            }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
      )}
    </div>
  );
}
