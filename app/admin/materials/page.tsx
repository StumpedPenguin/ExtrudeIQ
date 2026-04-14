import { supabaseServer } from "@/lib/supabase/server";
import MaterialsAdminClient from "./ui";
import Link from "next/link";

export default async function AdminMaterialsPage() {
  const supa = await supabaseServer();
  const { data: auth } = await supa.auth.getUser();

  if (!auth.user) {
    return (
      <div className="aurora-bg min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <p className="text-slate-400">You are not signed in.</p>
          <Link href="/login" className="aurora-btn px-4 py-2 text-sm mt-4 inline-block">Go to Login</Link>
        </div>
      </div>
    );
  }

  const { data: me } = await supa.from("profiles").select("role").eq("id", auth.user.id).single();

  if (!me || me.role !== "admin") {
    return (
      <div className="aurora-bg min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <p className="text-red-400 font-semibold">Forbidden</p>
          <Link href="/quotes" className="aurora-btn-secondary px-4 py-2 text-sm mt-4 inline-block">Back to Quotes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-cyan flex items-center justify-center text-[#060918] font-bold text-sm">E</div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Materials</h1>
                <p className="text-xs text-slate-500 mt-0.5">Admin \u00b7 Materials Management</p>
              </div>
            </div>
            <nav className="flex gap-3">
              <Link href="/dashboard" className="aurora-btn-secondary px-3 py-1.5 text-xs">Home</Link>
              <Link href="/quotes" className="aurora-btn-secondary px-3 py-1.5 text-xs">Quotes</Link>
              <Link href="/admin/users" className="aurora-btn-secondary px-3 py-1.5 text-xs">Users</Link>
            </nav>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-8 py-8">
        <MaterialsAdminClient />
      </div>
    </div>
  );
}
