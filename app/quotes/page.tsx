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
      <main className="min-h-screen bg-slate-950 px-4 py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-center">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur text-center">
            <p className="text-slate-300">
              You are not signed in. Go to <a href="/login" className="text-indigo-400 hover:text-indigo-300">sign in</a>.
            </p>
          </div>
        </div>
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
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Quotes</h1>
          <div className="flex gap-3">
            <a
              href="/dashboard"
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-600"
            >
              🏠 Home
            </a>
            <a
              href="/quotes/new"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              New Quote
            </a>
          </div>
        </div>

        <form method="GET" className="mb-6 flex gap-3">
          <input
            name="q"
            defaultValue={term}
            placeholder="Search quote # or customer..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Search
          </button>
          {term && (
            <a
              href="/quotes"
              className="self-center text-sm text-indigo-400 hover:text-indigo-300"
            >
              Clear
            </a>
          )}
        </form>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            Error loading quotes: {error.message}
          </div>
        )}

        <div className="rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-[220px_1fr_120px_220px] gap-4 border-b border-slate-800 bg-slate-900/40 px-6 py-4">
            <div className="text-sm font-semibold text-slate-300">Quote #</div>
            <div className="text-sm font-semibold text-slate-300">Customer</div>
            <div className="text-sm font-semibold text-slate-300">Status</div>
            <div className="text-sm font-semibold text-slate-300">Created</div>
          </div>

          {(rows || []).length > 0 ? (
            <div className="divide-y divide-slate-800">
              {(rows || []).map((r: any) => (
                <div
                  key={r.id}
                  className="grid grid-cols-[220px_1fr_120px_220px] gap-4 px-6 py-4 hover:bg-slate-900/30 transition-colors"
                >
                  <div>
                    <a
                      href={`/quotes/${r.id}`}
                      className="font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      {r.quote_number}
                    </a>
                  </div>
                  <div className="text-slate-300">{r.customer?.name || "—"}</div>
                  <div className="text-xs uppercase text-slate-400">{r.status}</div>
                  <div className="text-sm text-slate-400">{fmtDate(r.created_at)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-slate-400">No quotes found.</div>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Showing up to 50 most recent quotes{term ? ` matching "${term}"` : ""}.
        </p>
      </div>
    </main>
  );
}
