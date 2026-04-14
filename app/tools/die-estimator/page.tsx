"use client";

import * as React from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";

type DieType = "solid" | "hollow" | "coex";

function n(v: string): number { const x = Number(v); return Number.isFinite(x) ? x : 0; }

function money(x: number): string {
  if (!Number.isFinite(x)) return "$0";
  return x.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

type SettingsRow = {
  id: string; a0: number; k: number; cavity_slope: number;
  low_band: number; high_band: number; base_solid: number;
  base_hollow: number; base_coex: number;
};

export default function DieEstimatorPage() {
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const [dieType, setDieType] = React.useState<DieType>("solid");
  const [areaIn2, setAreaIn2] = React.useState<string>("0.20");
  const [cavities, setCavities] = React.useState<string>("1");
  const [settings, setSettings] = React.useState<SettingsRow>({
    id: "default", a0: 0.2, k: 0.4, cavity_slope: 0.35,
    low_band: 0.9, high_band: 1.12, base_solid: 6000, base_hollow: 9500, base_coex: 14000,
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("die_estimator_settings")
        .select("id,a0,k,cavity_slope,low_band,high_band,base_solid,base_hollow,base_coex")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (!cancelled && !error && data) setSettings(data as SettingsRow);
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  const area = n(areaIn2);
  const cav = Math.max(1, Math.floor(n(cavities) || 1));
  const baseByType: Record<DieType, number> = { solid: settings.base_solid, hollow: settings.base_hollow, coex: settings.base_coex };
  const base = baseByType[dieType];
  const sizeFactor = 1 + settings.k * Math.max(0, (area - settings.a0) / settings.a0);
  const cavityMult = 1 + settings.cavity_slope * (cav - 1);
  const expected = base * sizeFactor * cavityMult;
  const low = expected * settings.low_band;
  const high = expected * settings.high_band;
  const isValid = base > 0 && area > 0;

  return (
    <div className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-violet to-aurora-blue flex items-center justify-center text-white font-bold text-sm">D</div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Die Cost Estimator</h1>
                <p className="text-xs text-slate-500 mt-0.5">Stateless estimate using cross-sectional area</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard" className="aurora-btn-secondary px-3 py-1.5 text-xs">Home</Link>
              <Link href="/admin/die-estimator" className="aurora-btn-secondary px-3 py-1.5 text-xs">Admin Settings</Link>
              <Link href="/quotes" className="aurora-btn-secondary px-3 py-1.5 text-xs">Quotes</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-5">Inputs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Die type</label>
                <select value={dieType} onChange={(e) => setDieType(e.target.value as DieType)} className="aurora-select">
                  <option value="solid">Solid</option>
                  <option value="hollow">Hollow</option>
                  <option value="coex">Co-ex</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cavities</label>
                <input value={cavities} onChange={(e) => setCavities(e.target.value)} inputMode="decimal" className="aurora-input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cross-sectional area (in\u00b2)</label>
                <input value={areaIn2} onChange={(e) => setAreaIn2(e.target.value)} inputMode="decimal" className="aurora-input" />
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">How to get area</div>
                <div className="mt-2 text-sm text-white">Pull from CAD \u201cSection Properties \u2192 Area\u201d.</div>
                <div className="mt-1 text-xs text-slate-500">Settings loaded from Admin config.</div>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs p-3">
              Budgetary estimate only. Final tooling cost requires tooling/engineering review.
            </div>
          </div>

          {/* Outputs */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-5">Estimate</h2>
            <div className="space-y-4">
              <div className="glass-card glow-teal p-5">
                <div className="text-xs text-slate-500 mb-1">Estimated die cost range</div>
                <div className="text-2xl font-bold text-aurora-teal tracking-tight">{isValid ? `${money(low)} \u2013 ${money(high)}` : "$0 \u2013 $0"}</div>
              </div>
              <DRow label="Expected (midpoint)" value={money(expected)} />
              <DRow label="Base (by die type)" value={money(base)} />
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-sm font-bold text-white mb-3">Drivers</div>
                <div className="space-y-2">
                  <DRow label="Area (in\u00b2)" value={area > 0 ? area.toFixed(3) : "0.000"} />
                  <DRow label="Size factor" value={sizeFactor.toFixed(2)} />
                  <DRow label="Cavity multiplier" value={cavityMult.toFixed(2)} />
                </div>
                <div className="mt-3 text-xs text-slate-600">Formula: Base \u00d7 SizeFactor \u00d7 CavityMultiplier</div>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs p-3">
                No inputs are saved. This page only reads admin settings.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}
