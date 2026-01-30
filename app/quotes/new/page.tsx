import { supabaseServer } from "@/lib/supabase/server";
import NewQuoteForm from "./ui";

export const runtime = "nodejs";

export default async function NewQuotePage() {
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
    <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-white">New Quote</h1>
          <div className="flex gap-3">
            <a
              href="/dashboard"
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-600"
            >
              🏠 Home
            </a>
            <a
              href="/quotes"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Back to Quotes
            </a>
          </div>
        </div>

        <NewQuoteForm
          customers={customers || []}
          materials={materials || []}
        />
      </div>
    </main>
  );
}
