import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/dashboard/LogoutButton";

interface NavButton {
  label: string;
  href: string;
  description: string;
  icon: string;
}

export default async function AdminDashboardPage() {
  const supa = await supabaseServer();
  const { data: auth } = await supa.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const { data: profile } = await supa
    .from("profiles")
    .select("name")
    .eq("id", auth.user.id)
    .single();

  const userName = profile?.name || "User";

  const navButtons: NavButton[] = [
    { label: "Die Estimator", href: "/tools/die-estimator", description: "Estimate die costs", icon: "⚙️" },
    { label: "Users", href: "/admin/users", description: "Manage users", icon: "👥" },
    { label: "Materials", href: "/admin/materials", description: "Manage materials", icon: "📦" },
  ];

  return (
    <main className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-cyan flex items-center justify-center text-[#060918] font-bold text-sm">E</div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">ExtrudeIQ</h1>
                <p className="text-xs text-slate-400">Admin Dashboard · {userName}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Admin Tools</h2>
          <p className="text-slate-400 text-sm">Administrative tools and settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {navButtons.map((button) => (
            <Link
              key={button.label}
              href={button.href}
              className="group glass-card p-6 transition-all duration-300 hover:border-aurora-teal/20 hover:shadow-[0_0_30px_rgba(0,212,170,0.08)]"
            >
              <div className="text-3xl mb-4">{button.icon}</div>
              <h3 className="text-base font-semibold text-white mb-1 group-hover:text-aurora-teal transition-colors">{button.label}</h3>
              <p className="text-slate-400 text-sm">{button.description}</p>
              <div className="absolute right-5 bottom-5 text-slate-600 group-hover:text-aurora-teal/60 transition-colors text-lg">→</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
