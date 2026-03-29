"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log('[signup] form submitted with email:', email);
    setLoading(true);
    setError(null);

    try {
      console.log('[signup] sending fetch request');
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      console.log('[signup] fetch response received', { status: res.status, ok: res.ok });
      const data = await res.json();
      console.log('[signup] response parsed', data);
      setLoading(false);

      if (!res.ok) {
        console.log('[signup] error response:', data.error);
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        console.log('[signup] success');
        setSuccess(true);
      }
    } catch (err) {
      console.error('[signup] fetch error:', err);
      setLoading(false);
      setError("Network error. Please check your connection.");
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <p className="text-sm font-medium text-white">Check your email</p>
        <p className="mt-2 text-sm text-zinc-400">
          We sent a sign-in link to{" "}
          <span className="text-zinc-200">{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-300 mb-1.5"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
        />
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Sending…" : "Send Magic Link"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-zinc-300 hover:text-white transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
