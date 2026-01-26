import { supabaseServer } from "@/lib/supabase/server";
import AdminUsersClient from "./ui";

export default async function AdminUsersPage() {
  const supa = await supabaseServer();
  const { data: auth } = await supa.auth.getUser();

  if (!auth.user) {
    return (
      <main style={{ padding: 24 }}>
        <p>You are not signed in. Go to <a href="/login">/login</a>.</p>
      </main>
    );
  }

  const { data: me } = await supa
    .from("profiles")
    .select("role, email")
    .eq("id", auth.user.id)
    .single();

  if (!me || me.role !== "admin") {
    return (
      <main style={{ padding: 24 }}>
        <p>Forbidden.</p>
        <p><a href="/quotes">Back to Quotes</a></p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc" }}>
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
              Admin · Users
            </p>
          </div>

          <nav style={{ display: "flex", gap: 14 }}>
            <a href="/quotes" style={{ color: "white" }}>Quotes</a>
            <a href="/quotes/new" style={{ color: "white" }}>New Quote</a>
            <a href="/admin/users" style={{ color: "white", fontWeight: 700 }}>Admin</a>
          </nav>
        </div>
      </header>

      <section style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        <AdminUsersClient />
      </section>
    </main>
  );
}
