import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

interface NavButton {
  label: string;
  href: string;
  description: string;
  icon: string;
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
      label: "New Quote",
      href: "/quotes/new",
      description: "Create a new quote",
      icon: "📝",
    },
    {
      label: "Quote List",
      href: "/quotes",
      description: "View all quotes",
      icon: "📋",
    },
    {
      label: "Die Estimator",
      href: "/tools/die-estimator",
      description: "Estimate die costs",
      icon: "⚙️",
    },
    {
      label: "Users",
      href: "/admin/users",
      description: "Manage users",
      icon: "👥",
    },
    {
      label: "Customers",
      href: "/admin/customers",
      description: "Manage customers",
      icon: "🏢",
    },
    {
      label: "Materials",
      href: "/admin/materials",
      description: "Manage materials",
      icon: "📦",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur">
        <div className="mx-auto max-w-6xl px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">ExtrudeIQ</h1>
              <p className="text-slate-400 mt-1">Welcome, {userName}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-2">Dashboard</h2>
          <p className="text-slate-400">
            Quick access to your tools and data
          </p>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navButtons.map((button) => (
            <Link
              key={button.href}
              href={button.href}
              className="group relative overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50 p-6 transition-all hover:border-slate-500 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-700/0 to-slate-700/0 group-hover:from-slate-700/10 group-hover:to-slate-700/5 transition-all" />
              <div className="relative z-10">
                <div className="text-4xl mb-3">{button.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {button.label}
                </h3>
                <p className="text-slate-400 text-sm">{button.description}</p>
              </div>
              <div className="absolute right-4 bottom-4 text-slate-600 group-hover:text-slate-500 transition-colors">
                →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
