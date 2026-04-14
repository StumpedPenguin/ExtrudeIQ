import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import NewQuoteForm from "./ui";

export const runtime = "nodejs";

export default async function NewQuotePage() {
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

  const { data: materials } = await supa
    .from("materials")
    .select("id, family, grade, density_lb_in3, active")
    .eq("active", true)
    .order("family");

  const { data: accounts } = await supa
    .from("accounts")
    .select("id, name, type")
    .eq("status", "active")
    .order("name");

  const { data: opportunities } = await supa
    .from("opportunities")
    .select("id, name, account_id, status")
    .not("status", "in", "(won,lost)")
    .order("name");

  return (
    <main className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-cyan flex items-center justify-center text-[#060918] font-bold text-sm">E</div>
              <h1 className="text-xl font-bold text-white tracking-tight">New Quote</h1>
            </div>
            <div className="flex gap-3">
              <Link href="/quotes" className="aurora-btn-secondary px-4 py-2 text-xs">Back to Quotes</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 py-8">
        <NewQuoteForm
          materials={materials || []}
          accounts={accounts || []}
          opportunities={opportunities || []}
        />
      </div>
    </main>
  );
}
