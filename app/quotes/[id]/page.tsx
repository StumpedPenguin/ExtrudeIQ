// app/quotes/[id]/page.tsx
import { supabaseServer } from "@/lib/supabase/server";
import NewRevisionButton from "./NewRevisionButton";
import DeleteQuoteButton from "./DeleteQuoteButton";

function money(n: number) {
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // Check if user is admin (for delete button visibility)
  const { data: userProfile } = await supa
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  const isAdmin = userProfile?.role === "admin";

  const { data: quote, error: qErr } = await supa
    .from("quotes")
    .select("id, quote_number, status, created_at, customer:customers ( name )")
    .eq("id", id)
    .single();

  if (qErr || !quote) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Quote not found</h1>
        <p>{qErr?.message || "No record returned."}</p>
        <p>
          <a href="/quotes">Back to quotes</a>
        </p>
      </main>
    );
  }

  const { data: rev, error: rErr } = await supa
    .from("quote_revisions")
    .select(
      "revision_number, outputs_json, inputs_json, material_price_used, multiplier_used, created_at"
    )
    .eq("quote_id", id)
    .eq("is_current", true)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const outputs = (rev?.outputs_json || {}) as any;

  const basePrice = Number(outputs.base_price_per_piece ?? outputs.sell_price_per_piece);
  const materialCost = Number(outputs.material_cost_per_piece);
  const weightLb = Number(outputs.weight_lb_per_piece);

  const tiers = Array.isArray(outputs?.eau_moq_table) ? outputs.eau_moq_table : [];
  const eauBase = Number(outputs?.eau_base || 1000);

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc" }}>
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
            <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>Quote Detail</p>
          </div>

          <nav style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <a href="/quotes" style={{ color: "white" }}>
              Quotes
            </a>
            <a href="/quotes/new" style={{ color: "white" }}>
              New Quote
            </a>
            <NewRevisionButton quoteId={id} />
          </nav>
        </div>
      </header>

      {/* Content */}
      <section style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>{(quote as any).quote_number}</h2>
          <p style={{ marginTop: 6, opacity: 0.8 }}>
            Customer: <b>{(quote as any).customer?.name}</b> · Status:{" "}
            <b>{(quote as any).status}</b>
          </p>
          <p style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
            Current revision: <b>{rev ? `#${rev.revision_number}` : "—"}</b>
            {rev?.created_at ? ` · Calculated ${new Date(rev.created_at).toLocaleString()}` : ""}
          </p>
          {rErr && (
            <p style={{ marginTop: 8, color: "crimson", fontSize: 12 }}>
              Revision load warning: {rErr.message}
            </p>
          )}

          {/* Admin delete button */}
          {isAdmin && (
            <div style={{ marginTop: 12 }}>
              <DeleteQuoteButton quoteId={id} quoteNumber={(quote as any).quote_number} />
            </div>
          )}
        </div>

        {/* Summary cards */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div
            style={{
              background: "white",
              borderRadius: 10,
              padding: 16,
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Base Price / pc</h3>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{money(basePrice)}</div>
            <p style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
              Base EAU: {Number(eauBase).toLocaleString()}
            </p>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: 10,
              padding: 16,
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Material Cost / pc</h3>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{money(materialCost)}</div>
            <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
              Price used: {money(Number(rev?.material_price_used))} / lb · Multiplier:{" "}
              {rev ? Number(rev.multiplier_used).toFixed(4) : "—"}
            </p>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: 10,
              padding: 16,
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Weight / pc</h3>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {Number.isFinite(weightLb) ? weightLb.toFixed(4) : "—"} lb
            </div>
          </div>
        </section>

        {/* EAU + MOQ table */}
        <section style={{ marginTop: 20 }}>
          <h3 style={{ margin: "0 0 10px 0" }}>EAU Pricing & MOQ</h3>

          <div
            style={{
              background: "white",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "140px 160px 120px 140px 1fr",
                padding: "10px 12px",
                background: "#f1f5f9",
                fontWeight: 700,
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div>EAU</div>
              <div>Price / pc</div>
              <div>Discount</div>
              <div>MOQ</div>
              <div>Notes</div>
            </div>

            {tiers.map((t: any) => (
              <div
                key={t.eau}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 160px 120px 140px 1fr",
                  padding: "10px 12px",
                  borderBottom: "1px solid #f1f5f9",
                  alignItems: "center",
                  fontSize: 14,
                }}
              >
                <div>{Number(t.eau).toLocaleString()}</div>
                <div style={{ fontWeight: 600 }}>
                  {money(Number(t.price_per_piece))}
                </div>
                <div style={{ opacity: 0.85 }}>
                  {Number(t.discount_pct).toFixed(2)}%
                </div>
                <div>{Number(t.moq_pieces).toLocaleString()}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{t.notes || ""}</div>
              </div>
            ))}

            {tiers.length === 0 && (
              <div style={{ padding: 12, opacity: 0.8 }}>No EAU tiers available.</div>
            )}
          </div>

          <p style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
            Tier pricing is capped so it does not increase above the base price. Discounts are limited to a
            maximum of 15%. MOQ is calculated per tier to recover setup + minimum gross profit.
          </p>
        </section>
      </section>
    </main>
  );
}
