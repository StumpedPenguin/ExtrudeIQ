"use client";

import * as React from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginPageContent() {
  const searchParams = useSearchParams();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const redirectTo = searchParams.get("redirect") || "/dashboard";

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

      window.location.href = data.redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setLoading(false);
    }
  }

  return (
    <div className="aurora-bg min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2">
          {/* Left: Brand panel */}
          <div className="hidden lg:block glass-card glow-teal p-10 relative overflow-hidden">
            <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-aurora-teal/10 blur-3xl" />
            <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-aurora-violet/10 blur-3xl" />

            <div className="flex h-full flex-col justify-between relative">
              <div>
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur">
                    <Image
                      src="/extrudeiq-logo.svg"
                      alt="ExtrudeIQ"
                      fill
                      className="object-contain p-1.5"
                      priority
                    />
                  </div>
                  <div>
                    <div className="text-lg font-bold tracking-tight text-white">ExtrudeIQ</div>
                    <div className="text-xs text-aurora-teal/80">Quoting & tooling estimator</div>
                  </div>
                </div>

                <div className="mt-12 text-4xl font-bold tracking-tight text-white leading-tight">
                  Welcome<br />back.
                </div>
                <div className="mt-4 text-sm leading-7 text-slate-300/80">
                  Sign in to access quotes, customers, materials, and the die cost estimator.
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  {["Quotes", "CRM", "Materials", "Die Estimator"].map((f) => (
                    <span key={f} className="inline-flex items-center rounded-full border border-aurora-teal/20 bg-aurora-teal/5 px-3 py-1 text-xs font-medium text-aurora-teal">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-500/60">Testing Only · ExtrudeIQ</div>
            </div>
          </div>

          {/* Right: Login card */}
          <div className="glass-card glow-violet p-8 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-aurora-violet/8 blur-3xl" />

            <div className="flex items-center gap-3 lg:hidden relative">
              <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <Image src="/extrudeiq-logo.png" alt="ExtrudeIQ" fill className="object-contain p-1" priority />
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight text-white">ExtrudeIQ</div>
                <div className="text-xs text-aurora-teal/80">Sign in</div>
              </div>
            </div>

            <div className="mt-6 relative">
              <h1 className="text-2xl font-bold text-white">Sign in</h1>
              <p className="mt-2 text-sm text-slate-400">Use your ExtrudeIQ credentials.</p>
            </div>

            <form onSubmit={onSubmit} className="mt-8 grid gap-5 relative">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="aurora-input" autoComplete="email" required disabled={loading} placeholder="you@company.com" />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="aurora-input" autoComplete="current-password" required disabled={loading} placeholder="••••••••" />
              </label>

              {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
              ) : null}

              <button type="submit" disabled={loading} className="aurora-btn mt-2 py-3 text-sm">
                {loading ? "Signing in…" : "Sign in"}
              </button>

              <div className="text-xs text-slate-500 text-center">
                Trouble signing in? Contact an admin to confirm your account is invited and active.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="aurora-bg min-h-screen" />}>
      <LoginPageContent />
    </Suspense>
  );
}
