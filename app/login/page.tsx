import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signInAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supa = await supabaseServer();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(135deg, #0f172a, #020617)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {/* Brand header */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
            padding: "24px 20px",
            color: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Logo placeholder */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: "rgba(255,255,255,0.15)",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              IQ
            </div>

            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
                ExtrudeIQ
              </h1>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
                Internal Quoting Platform
              </p>
            </div>
          </div>
        </div>

        {/* Login form */}
        <div style={{ padding: 24 }}>
          <form action={signInAction} style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Email</span>
              <input
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Password</span>
              <input
                name="password"
                type="password"
                required
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              />
            </label>

            <button
              type="submit"
              style={{
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "white",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Sign in
            </button>

            {error && (
              <p style={{ margin: 0, color: "#b91c1c", fontSize: 13 }}>
                {error}
              </p>
            )}
          </form>
        </div>
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: "#94a3b8" }}>
        © {new Date().getFullYear()} ExtrudeIQ
      </p>
    </main>
  );
}
