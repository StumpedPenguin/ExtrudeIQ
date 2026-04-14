"use client";

import * as React from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";

type SettingsRow = {
  id: string; a0: number; k: number; cavity_slope: number;
  low_band: number; high_band: number; base_solid: number;
  base_hollow: number; base_coex: number; updated_at?: string; updated_by?: string | null;
};

const FIXED_ID = "00000000-0000-0000-0000-000000000001";

function n(v: string): number { const x = Number(v); return Number.isFinite(x) ? x : 0; }

export default function DieEstimatorAdminPage() {
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const [a0, setA0] = React.useState("0.2");
  const [k, setK] = React.useState("0.4");
  const [cavitySlope, setCavitySlope] = React.useState("0.35");
  const [lowBand, setLowBand] = React.useState("0.90");
  const [highBand, setHighBand] = React.useState("1.12");
  const [baseSolid, setBaseSolid] = React.useState("6000");
  const [baseHollow, setBaseHollow] = React.useState("9500");
  const [baseCoex, setBaseCoex] = React.useState("14000");

  const load = React.useCallback(async () => {
    setLoading(true); setError(null); setOk(null);
    const { data, error: e } = await supabase.from("die_estimator_settings").select("id,a0,k,cavity_slope,low_band,high_band,base_solid,base_hollow,base_coex,updated_at,updated_by").eq("id", FIXED_ID).maybeSingle();
    if (e) { setError(e.message); setLoading(false); return; }
    if (!data) { setError(`No settings row found. Ensure die_estimator_settings contains id ${FIXED_ID}.`); setLoading(false); return; }
    const s = data as SettingsRow;
    setA0(String(s.a0)); setK(String(s.k)); setCavitySlope(String(s.cavity_slope));
    setLowBand(String(s.low_band)); setHighBand(String(s.high_band));
    setBaseSolid(String(s.base_solid)); setBaseHollow(String(s.base_hollow)); setBaseCoex(String(s.base_coex));
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => { void load(); }, [load]);

  async function save() {
    setSaving(true); setError(null); setOk(null);
    const a0v = n(a0), kv = n(k), cavv = n(cavitySlope), lowv = n(lowBand), highv = n(highBand);
    if (a0v <= 0) return fail("A0 must be > 0.");
    if (kv <= 0) return fail("K must be > 0.");
    if (cavv < 0) return fail("Cavity slope must be >= 0.");
    if (lowv <= 0 || lowv >= 2) return fail("Low band must be between 0 and 2.");
    if (highv <= 0 || highv >= 3) return fail("High band must be between 0 and 3.");
    if (highv <= lowv) return fail("High band must be greater than low band.");
    const solid = Math.max(0, Math.floor(n(baseSolid)));
    const hollow = Math.max(0, Math.floor(n(baseHollow)));
    const coex = Math.max(0, Math.floor(n(baseCoex)));
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;
    const { data, error: e } = await supabase.from("die_estimator_settings").update({ a0: a0v, k: kv, cavity_slope: cavv, low_band: lowv, high_band: highv, base_solid: solid, base_hollow: hollow, base_coex: coex, updated_by: userId }).eq("id", FIXED_ID).select("id,a0,k,cavity_slope,low_band,high_band,base_solid,base_hollow,base_coex,updated_at,updated_by").single();
    if (e) { setError(e.message); setSaving(false); return; }
    const s = data as SettingsRow;
    setA0(String(s.a0)); setK(String(s.k)); setCavitySlope(String(s.cavity_slope));
    setLowBand(String(s.low_band)); setHighBand(String(s.high_band));
    setBaseSolid(String(s.base_solid)); setBaseHollow(String(s.base_hollow)); setBaseCoex(String(s.base_coex));
    setOk("Settings saved."); setSaving(false);
  }

  function fail(msg: string) { setError(msg); setSaving(false); }

  function resetToRecommended() {
    setA0("0.2"); setK("0.4"); setCavitySlope("0.35"); setLowBand("0.90"); setHighBand("1.12");
    setBaseSolid("6000"); setBaseHollow("9500"); setBaseCoex("14000"); setOk(null); setError(null);
  }

  return (
    <div className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-cyan flex items-center justify-center text-[#060918] font-bold text-sm">E</div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Die Estimator Settings</h1>
                <p className="text-xs text-slate-500 mt-0.5">Admin configuration for Die Cost Estimator</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard" className="aurora-btn-secondary px-3 py-1.5 text-xs">Home</Link>
              <Link href="/tools/die-estimator" className="aurora-btn-secondary px-3 py-1.5 text-xs">Open Estimator</Link>
              <Link href="/quotes" className="aurora-btn-secondary px-3 py-1.5 text-xs">Quotes</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Config form */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Configuration</h2>
              <button type="button" onClick={resetToRecommended} className="aurora-btn-secondary px-3 py-1.5 text-xs">Reset defaults</button>
            </div>

            {loading ? <div className="text-sm text-slate-500">Loading\u2026</div> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="A0 (baseline area in\u00b2)" value={a0} onChange={setA0} hint="in\u00b2" />
                <Field label="K (area sensitivity)" value={k} onChange={setK} />
                <Field label="Cavity slope" value={cavitySlope} onChange={setCavitySlope} />
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Formula</div>
                  <div className="mt-2 text-sm text-white">Base \u00d7 SizeFactor \u00d7 CavityMultiplier</div>
                  <div className="mt-1 text-xs text-slate-500">SizeFactor = 1 + K \u00d7 max(0, (Area \u2212 A0) / A0)</div>
                </div>
                <Field label="Low band" value={lowBand} onChange={setLowBand} hint="\u00d7" />
                <Field label="High band" value={highBand} onChange={setHighBand} hint="\u00d7" />
                <Field label="Base: Solid" value={baseSolid} onChange={setBaseSolid} hint="$" />
                <Field label="Base: Hollow" value={baseHollow} onChange={setBaseHollow} hint="$" />
                <Field label="Base: Co-ex" value={baseCoex} onChange={setBaseCoex} hint="$" />
              </div>
            )}

            {error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm p-3">{error}</div>}
            {ok && <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm p-3">{ok}</div>}

            <div className="mt-5 flex gap-2">
              <button type="button" disabled={loading || saving} onClick={save} className="aurora-btn px-5 py-2.5 text-sm">{saving ? "Saving\u2026" : "Save settings"}</button>
              <button type="button" disabled={loading || saving} onClick={load} className="aurora-btn-secondary px-5 py-2.5 text-sm">Reload</button>
            </div>
          </div>

          {/* Preview */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-1">Preview</h2>
            <p className="text-xs text-slate-500 mb-5">These values are applied immediately by the estimator page.</p>
            <div className="space-y-2">
              <PRow label="A0" value={a0} /><PRow label="K" value={k} /><PRow label="Cavity slope" value={cavitySlope} />
              <PRow label="Low band" value={lowBand} /><PRow label="High band" value={highBand} />
              <PRow label="Base solid" value={baseSolid} /><PRow label="Base hollow" value={baseHollow} /><PRow label="Base co-ex" value={baseCoex} />
            </div>
            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs p-3">
              If you get RLS errors, confirm your UPDATE policy matches your admin role schema.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" className="aurora-input pr-10" />
        {hint && <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-600">{hint}</div>}
      </div>
    </div>
  );
}

function PRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}
