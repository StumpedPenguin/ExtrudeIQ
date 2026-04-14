"use client";

import { useMemo, useState } from "react";

type Material = {
  id: string;
  family: string;
  grade: string | null;
  density_lb_in3: number;
  active: boolean;
};
type Account = { id: string; name: string; type: string };
type Opportunity = { id: string; name: string; account_id: string; status: string };

export default function NewQuoteForm({
  materials,
  accounts,
  opportunities = [],
}: {
  materials: Material[];
  accounts: Account[];
  opportunities?: Opportunity[];
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [opportunityId, setOpportunityId] = useState("");
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? "");
  const [finishedLen, setFinishedLen] = useState<number>(48);
  const [eauBase, setEauBase] = useState<number>(1000);

  const [mode, setMode] = useState<"area" | "wpf">("area");
  const [areaIn2, setAreaIn2] = useState<number>(0.5);
  const [wpf, setWpf] = useState<number>(0);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ quote_number: string; quote_id: string } | null>(null);

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === materialId) || null,
    [materials, materialId]
  );

  const weightPreviewLb = useMemo(() => {
    const len = Number(finishedLen) || 0;
    if (!selectedMaterial || len <= 0) return 0;
    const density = Number(selectedMaterial.density_lb_in3);
    if (mode === "area") {
      const a = Number(areaIn2) || 0;
      return a > 0 ? a * len * density : 0;
    } else {
      const x = Number(wpf) || 0;
      return x > 0 ? x * (len / 12) : 0;
    }
  }, [finishedLen, selectedMaterial, mode, areaIn2, wpf]);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    setResult(null);
    try {
      const payload = {
        account_id: accountId,
        material_id: materialId,
        finished_length_in: Number(finishedLen),
        area_in2: mode === "area" ? Number(areaIn2) : null,
        weight_lb_per_ft: mode === "wpf" ? Number(wpf) : null,
        eau_base: Number(eauBase),
        opportunity_id: opportunityId || null,
      };
      const resp = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Error saving quote");
      window.location.href = `/quotes/${data.quote_id}`;
    } catch (e: any) {
      setMsg(e?.message || "Error saving quote");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Inputs Panel */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white mb-6">Inputs</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Account *</label>
            <select className="aurora-select" value={accountId} onChange={(e) => { setAccountId(e.target.value); setOpportunityId(""); }}>
              <option value="">-- Select Account --</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Material</label>
            <select className="aurora-select" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.family}{m.grade ? ` \u2014 ${m.grade}` : ""} (density {Number(m.density_lb_in3).toFixed(6)})
                </option>
              ))}
            </select>
          </div>

          {accountId && opportunities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Opportunity (Optional)</label>
              <select className="aurora-select" value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)}>
                <option value="">-- Select Opportunity --</option>
                {opportunities.filter((o) => o.account_id === accountId).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Finished length (in)</label>
            <input className="aurora-input" type="number" step="0.01" value={finishedLen} onChange={(e) => setFinishedLen(Number(e.target.value))} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Base EAU (pcs/year)</label>
            <input className="aurora-input" type="number" step="1" value={eauBase} onChange={(e) => setEauBase(Number(e.target.value))} />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" checked={mode === "area"} onChange={() => setMode("area")} className="h-4 w-4 accent-[#00d4aa]" />
              <span className="text-sm text-slate-300">Use cross-section area (in\u00b2)</span>
            </label>
            {mode === "area" && (
              <div className="ml-7">
                <label className="block text-sm font-medium text-slate-300 mb-2">Area (in\u00b2)</label>
                <input className="aurora-input" type="number" step="0.0001" value={areaIn2} onChange={(e) => setAreaIn2(Number(e.target.value))} />
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" checked={mode === "wpf"} onChange={() => setMode("wpf")} className="h-4 w-4 accent-[#00d4aa]" />
              <span className="text-sm text-slate-300">Use weight per foot (lb/ft)</span>
            </label>
            {mode === "wpf" && (
              <div className="ml-7">
                <label className="block text-sm font-medium text-slate-300 mb-2">Weight per foot (lb/ft)</label>
                <input className="aurora-input" type="number" step="0.0001" value={wpf} onChange={(e) => setWpf(Number(e.target.value))} />
              </div>
            )}
          </div>

          <button type="button" onClick={onSave} disabled={saving} className="aurora-btn w-full py-3 mt-4">
            {saving ? "Saving..." : "Save Quote"}
          </button>

          {msg && <p className={msg === "Saved." ? "text-aurora-teal text-sm" : "text-red-400 text-sm"}>{msg}</p>}

          {result && (
            <div className="mt-4 glass-card glow-teal p-4">
              <p className="text-sm text-slate-300">Quote created: <span className="font-semibold text-aurora-teal">{result.quote_number}</span></p>
              <p className="mt-3"><a href={`/quotes/${result.quote_id}`} className="font-semibold text-aurora-teal hover:underline">View quote \u2192</a></p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white mb-6">Live Preview</h2>
        <div className="space-y-4">
          <div className="rounded-xl border border-aurora-teal/20 bg-aurora-teal/5 p-5">
            <p className="text-sm text-slate-400">Weight per piece</p>
            <p className="mt-2 text-3xl font-bold text-aurora-teal">
              {weightPreviewLb.toFixed(4)} <span className="text-lg text-slate-400">lb</span>
            </p>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            Material price and per-piece price are calculated on save using the latest effective material price in the database.
          </p>
        </div>
      </div>
    </section>
  );
}
