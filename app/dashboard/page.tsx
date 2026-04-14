import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

interface NavButton {
  label: string;
  href: string;
  description: string;
  icon: string;
  gradient: string;
}

export default async function DashboardPage() {
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
    {
      label: "Leads",
      href: "/admin/crm/leads",
      description: "Manage sales leads",
      icon: "🎯",
      gradient: "from-aurora-violet/20 to-aurora-blue/10",
    },
    {
      label: "Opportunities",
      href: "/admin/crm/opportunities",
      description: "View all opportunities",
      icon: "🎲",
      gradient: "from-amber-500/15 to-aurora-teal/10",
    },
    {
      label: "Accounts",
      href: "/admin/crm/accounts",
      description: "Manage customer accounts",
      icon: "🏛️",
      gradient: "from-aurora-teal/15 to-aurora-violet/10",
    },
    {
      label: "Pipeline",
      href: "/admin/crm/pipeline",
      description: "View sales pipeline",
      icon: "📈",
      gradient: "from-emerald-500/20 to-aurora-teal/10",
    },
    {
      label: "New Quote",
      href: "/quotes/new",
      description: "Create a new quote",
      icon: "📝",
      gradient: "from-aurora-teal/20 to-aurora-cyan/10",
    },
    {
      label: "Quote List",
      href: "/quotes",
      description: "View all quotes",
      icon: "📋",
      gradient: "from-aurora-blue/20 to-aurora-cyan/10",
    },
    {
      label: "Admin Dashboard",
      href: "/admin/dashboard",
      description: "Tools and settings",
      icon: "⚙️",
      gradient: "from-slate-500/15 to-aurora-violet/10",
    },
  ];

  return (
    <main className="aurora-bg min-h-screen">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-cyan flex items-center justify-center text-[#060918] font-bold text-sm">
                E
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">ExtrudeIQ</h1>
                <p className="text-xs text-slate-400">Welcome, {userName}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-8 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
          <p className="text-slate-400 text-sm">Quick access to your tools and data</p>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {navButtons.map((button) => (
            <Link
              key={button.label}
              href={button.href}
              className="group glass-card p-6 transition-all duration-300 hover:border-aurora-teal/20 hover:shadow-[0_0_30px_rgba(0,212,170,0.08)]"
            >
              <div className={`absolute inset-0 rounded-[16px] bg-gradient-to-br ${button.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative z-10">
                <div className="text-3xl mb-4">{button.icon}</div>
                <h3 className="text-base font-semibold text-white mb-1 group-hover:text-aurora-teal transition-colors">
                  {button.label}
                </h3>
                <p className="text-slate-400 text-sm">{button.description}</p>
              </div>
              <div className="absolute right-5 bottom-5 text-slate-600 group-hover:text-aurora-teal/60 transition-colors text-lg">
                →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
