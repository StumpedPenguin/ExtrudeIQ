import { supabaseServer } from "@/lib/supabase/server";

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

export default async function QuotesListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

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

  // Base query
  let query = supa
    .from("quotes")
    .select(
      "id, quote_number, status, created_at, updated_at, customer:customers ( id, name )"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  // Simple search: quote_number ILIKE OR customer name ILIKE
  // Note: Supabase "or" supports foreign table fields in many cases via select alias;
  // if this ever fails in your environment, we can switch search to a small API route.
  const term = (q || "").trim();
  if (term) {
    // Search quote_number OR customer name
    query = query.or(`quote_number.ilike.%${term}%,customers.name.ilike.%${term}%`);
  }

  const { data: rows, error } = await query;

  return (
    <main style={{ padding: 24, maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
        <h1 style={{ margin: 0 }}>Quotes</h1>
        <a href="/quotes/new">New Quote</a>
      </div>

      <form method="GET" style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <input
          name="q"
          defaultValue={term}
          placeholder="Search quote # or customer..."
          style={{ flex: 1, padding: 10 }}
        />
        <button type="submit" style={{ padding: "10px 14px" }}>
          Search
        </button>
        {term && (
          <a href="/quotes" style={{ alignSelf: "center" }}>
            Clear
          </a>
        )}
      </form>

      {error && (
        <p style={{ marginTop: 16, color: "crimson" }}>
          Error loading quotes: {error.message}
        </p>
      )}

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr 120px 220px",
            padding: "10px 12px",
            background: "#fafafa",
            fontWeight: 700,
            borderBottom: "1px solid #eee",
          }}
        >
          <div>Quote #</div>
          <div>Customer</div>
          <div>Status</div>
          <div>Created</div>
        </div>

        {(rows || []).map((r: any) => (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "220px 1fr 120px 220px",
              padding: "10px 12px",
              borderBottom: "1px solid #f0f0f0",
              alignItems: "center",
            }}
          >
            <div>
              <a href={`/quotes/${r.id}`} style={{ fontWeight: 600 }}>
                {r.quote_number}
              </a>
            </div>
            <div>{r.customer?.name || "—"}</div>
            <div style={{ textTransform: "uppercase", fontSize: 12, opacity: 0.8 }}>{r.status}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{fmtDate(r.created_at)}</div>
          </div>
        ))}

        {(rows || []).length === 0 && !error && (
          <div style={{ padding: 12, opacity: 0.8 }}>No quotes found.</div>
        )}
      </div>

      <p style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        Showing up to 50 most recent quotes{term ? ` matching "${term}"` : ""}.
      </p>
    </main>
  );
}
