import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";

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
      <main className="aurora-bg min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <p className="text-slate-300">You are not signed in. <a href="/login" className="text-aurora-teal hover:underline">Sign in</a>.</p>
        </div>
      </main>
    );
  }

  let query = supa
    .from("quotes")
    .select("id, quote_number, status, created_at, updated_at, account:accounts ( id, name )")
    .order("created_at", { ascending: false })
    .limit(50);

  const term = (q || "").trim();
  if (term) {
    query = query.or(`quote_number.ilike.%${term}%,accounts.name.ilike.%${term}%`);
  }

  const { data: rows, error } = await query;

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      draft: "bg-slate-500/20 text-slate-300",
      sent: "bg-aurora-blue/20 text-aurora-blue",
      accepted: "bg-aurora-teal/20 text-aurora-teal",
      won: "bg-emerald-500/20 text-emerald-400",
      lost: "bg-red-500/20 text-red-400",
    };
    return m[s] || "bg-slate-500/20 text-slate-300";
  };

  return (
    <main className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-cyan flex items-center justify-center text-[#060918] font-bold text-sm">E</div>
              <h1 className="text-xl font-bold text-white tracking-tight">Quotes</h1>
            </div>
            <div className="flex gap-3">
              <Link href="/quotes/new" className="aurora-btn px-4 py-2 text-xs">New Quote</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 py-8">
        <form method="GET" className="mb-6 flex gap-3">
          <input name="q" defaultValue={term} placeholder="Search quote # or account..." className="aurora-input flex-1" />
          <button type="submit" className="aurora-btn px-5 py-2.5 text-sm">Search</button>
          {term && <a href="/quotes" className="self-center text-sm text-aurora-teal hover:underline">Clear</a>}
        </form>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Error loading quotes: {error.message}
          </div>
        )}

        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-[200px_1fr_100px_200px] gap-4 border-b border-white/[0.06] px-6 py-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Quote #</div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Account</div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Created</div>
          </div>

          {(rows || []).length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {(rows || []).map((r: any) => (
                <div key={r.id} className="grid grid-cols-[200px_1fr_100px_200px] gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <a href={`/quotes/${r.id}`} className="font-semibold text-aurora-teal hover:text-aurora-teal/80 transition-colors">{r.quote_number}</a>
                  </div>
                  <div className="text-slate-300">{r.account?.name || "\u2014"}</div>
                  <div>
                    <span className={`aurora-badge ${statusColor(r.status)}`}>{r.status}</span>
                  </div>
                  <div className="text-sm text-slate-400">{fmtDate(r.created_at)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-slate-500">No quotes found.</div>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Showing up to 50 most recent quotes{term ? ` matching "${term}"` : ""}.
        </p>
      </div>
    </main>
  );
}
