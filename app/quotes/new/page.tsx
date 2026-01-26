import { supabaseServer } from "@/lib/supabase/server";
import NewQuoteForm from "./ui";

export const runtime = "nodejs";

export default async function NewQuotePage() {
  const supa = await supabaseServer();

  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) {
    return (
      <main style={{ padding: 24 }}>
        <p>
          You are not signed in. Go to <a href="/login">/login</a>.
        </p>
      </main>
    );
  }

  const { data: customers } = await supa
    .from("customers")
    .select("id, name, status")
    .eq("status", "active")
    .order("name");

  const { data: materials } = await supa
    .from("materials")
    .select("id, family, grade, density_lb_in3, active")
    .eq("active", true)
    .order("family");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
          color: "white",
          padding: "16px 24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>ExtrudeIQ</h1>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
              New Quote
            </p>
          </div>

          <nav style={{ display: "flex", gap: 14 }}>
            <a href="/quotes" style={{ color: "white" }}>Quotes</a>
            <a href="/quotes/new" style={{ color: "white", fontWeight: 600 }}>
              New Quote
            </a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <section style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <NewQuoteForm
          customers={customers || []}
          materials={materials || []}
        />
      </section>
    </main>
  );
}
