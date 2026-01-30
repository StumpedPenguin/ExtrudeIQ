"use client";

import * as React from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const redirectTo = searchParams.get("redirect") || "/quotes";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, redirectTo }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Redirect after successful login
      window.location.href = data.redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-2">
          {/* Left: Brand panel */}
          <div className="hidden overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-indigo-600/20 via-slate-950 to-slate-950 p-10 shadow-2xl lg:block">
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  {/* Optional: if you have a logo in /public, use it here */}
                  <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                    <Image
                      src="/extrudeiq-logo.svg"
                      alt="ExtrudeIQ"
                      fill
                      className="object-contain p-1"
                      priority
                    />
                  </div>
                  <div>
                    <div className="text-lg font-semibold tracking-tight text-white">
                      ExtrudeIQ
                    </div>
                    <div className="text-xs text-slate-300">
                      Quoting & tooling estimator
                    </div>
                  </div>
                </div>

                <div className="mt-10 text-3xl font-semibold tracking-tight text-white">
                  Welcome back.
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-300">
                  Sign in to access quotes, customers, materials, and the die cost estimator.
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Testing Only • ExtrudeIQ
              </div>
            </div>
          </div>

          {/* Right: Login card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                <Image
                  src="/extrudeiq-logo.png"
                  alt="ExtrudeIQ"
                  fill
                  className="object-contain p-1"
                  priority
                />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight text-white">
                  ExtrudeIQ
                </div>
                <div className="text-xs text-slate-300">
                  Sign in
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h1 className="text-xl font-semibold text-white">Sign in</h1>
              <p className="mt-1 text-sm text-slate-300">
                Use your ExtrudeIQ credentials.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-200">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-200">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </label>

              {error ? (
                <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>

              <div className="text-xs text-slate-400">
                Trouble signing in? Contact an admin to confirm your account is invited and active.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
