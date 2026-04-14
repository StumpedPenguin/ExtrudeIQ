// app/quotes/[id]/page.tsx
import { supabaseServer } from "@/lib/supabase/server";
import { generateEauTiers, buildEauMoqTable } from "@/lib/quotes/pricing";
import Link from "next/link";
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
      <main className="aurora-bg min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <p className="text-slate-300">You are not signed in. <a href="/login" className="text-aurora-teal hover:underline">Sign in</a>.</p>
        </div>
      </main>
    );
  }

  const { data: userProfile } = await supa.from("profiles").select("role").eq("id", auth.user.id).single();
  const isAdmin = userProfile?.role === "admin";

  const { data: quote, error: qErr } = await supa
    .from("quotes")
    .select("id, quote_number, status, created_at, account_id, opportunity_id, account:accounts ( id, name ), opportunity:opportunities ( id, name )")
    .eq("id", id)
    .single();

  if (qErr || !quote) {
    return (
      <main className="aurora-bg min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <h1 className="text-xl font-bold text-white mb-2">Quote not found</h1>
          <p className="text-slate-400 text-sm mb-4">{qErr?.message || "No record returned."}</p>
          <a href="/quotes" className="text-aurora-teal hover:underline text-sm">Back to quotes</a>
        </div>
      </main>
    );
  }

  const { data: rev, error: rErr } = await supa
    .from("quote_revisions")
    .select("revision_number, outputs_json, inputs_json, material_price_used, multiplier_used, created_at")
    .eq("quote_id", id)
    .eq("is_current", true)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const outputs = (rev?.outputs_json || {}) as any;
  const basePrice = Number(outputs.base_price_per_piece ?? outputs.sell_price_per_piece);
  const materialCost = Number(outputs.material_cost_per_piece);
  const weightLb = Number(outputs.weight_lb_per_piece);
  const eauBase = Number(outputs?.eau_base || 1000);

  let tiers: any[] = [];
  if (Array.isArray(outputs?.eau_moq_table) && outputs.eau_moq_table.length > 0) {
    tiers = outputs.eau_moq_table;
  } else {
    const tierEaus = generateEauTiers(eauBase);
    tiers = buildEauMoqTable({
      eau_base: eauBase,
      tiers: tierEaus,
      price_base_per_piece: basePrice,
      material_cost_per_piece: materialCost,
    });
  }

  return (
    <main className="aurora-bg min-h-screen">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-cyan flex items-center justify-center text-[#060918] font-bold text-sm">E</div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Quote Detail</h1>
              </div>
            </div>
            <nav className="flex items-center gap-3">
              <Link href="/dashboard" className="aurora-btn-secondary px-4 py-2 text-xs">Home</Link>
              <Link href="/quotes" className="aurora-btn-secondary px-4 py-2 text-xs">Quotes</Link>
              <Link href="/quotes/new" className="aurora-btn-secondary px-4 py-2 text-xs">New Quote</Link>
              <NewRevisionButton quoteId={id} />
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">{(quote as any).quote_number}</h2>
          <p className="mt-2 text-sm text-slate-400">
            Account:{" "}
            <Link href={`/admin/crm/accounts/${(quote as any).account_id}`} className="font-semibold text-aurora-teal hover:underline">
              {(quote as any).account?.name || "\u2014"}
            </Link>
            {(quote as any).opportunity?.name && (
              <>
                {" "}\u00b7 Opportunity:{" "}
                <Link href={`/admin/crm/opportunities/${(quote as any).opportunity_id}`} className="font-semibold text-aurora-teal hover:underline">
                  {(quote as any).opportunity.name}
                </Link>
              </>
            )}
            {" "}\u00b7 Status: <span className="font-semibold text-white">{(quote as any).status}</span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Current revision: <span className="font-semibold text-white">{rev ? `#${rev.revision_number}` : "\u2014"}</span>
            {rev?.created_at ? ` \u00b7 Calculated ${new Date(rev.created_at).toLocaleString()}` : ""}
          </p>
          {rErr && <p className="mt-2 text-xs text-red-400">Revision load warning: {rErr.message}</p>}
          {isAdmin && (
            <div className="mt-4">
              <DeleteQuoteButton quoteId={id} quoteNumber={(quote as any).quote_number} />
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="glass-card glow-teal p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Base Price / pc</h3>
            <div className="text-2xl font-bold text-aurora-teal">{money(basePrice)}</div>
            <p className="mt-2 text-xs text-slate-500">Base EAU: {Number(eauBase).toLocaleString()}</p>
          </div>
          <div className="glass-card glow-violet p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Material Cost / pc</h3>
            <div className="text-xl font-bold text-aurora-violet">{money(materialCost)}</div>
            <p className="text-xs text-slate-500 mt-2">
              Price used: {money(Number(rev?.material_price_used))} / lb \u00b7 Multiplier: {rev ? Number(rev.multiplier_used).toFixed(4) : "\u2014"}
            </p>
          </div>
          <div className="glass-card glow-blue p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Weight / pc</h3>
            <div className="text-xl font-bold text-aurora-blue">
              {Number.isFinite(weightLb) ? weightLb.toFixed(4) : "\u2014"} lb
            </div>
          </div>
        </div>

        {/* EAU + MOQ table */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">EAU Pricing & MOQ</h3>

          <div className="glass-card overflow-hidden">
            <table className="aurora-table">
              <thead>
                <tr>
                  <th>EAU</th>
                  <th>Price / pc</th>
                  <th>Discount</th>
                  <th>MOQ</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t: any) => (
                  <tr key={t.eau}>
                    <td className="font-medium text-white">{Number(t.eau).toLocaleString()}</td>
                    <td className="font-semibold text-aurora-teal">{money(Number(t.price_per_piece))}</td>
                    <td>{Number(t.discount_pct).toFixed(2)}%</td>
                    <td>{Number(t.moq_pieces).toLocaleString()}</td>
                    <td className="text-xs text-slate-500">{t.notes || ""}</td>
                  </tr>
                ))}
                {tiers.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-500">No EAU tiers available.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Tier pricing is capped so it does not increase above the base price. Discounts are limited to a maximum of 15%. MOQ is calculated per tier to recover setup + minimum gross profit.
          </p>
        </div>
      </section>
    </main>
  );
}
