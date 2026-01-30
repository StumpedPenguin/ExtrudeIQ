"use client";

import { useMemo, useState } from "react";

type Customer = { id: string; name: string; status: string };
type Material = {
  id: string;
  family: string;
  grade: string | null;
  density_lb_in3: number;
  active: boolean;
};

export default function NewQuoteForm({
  customers,
  materials,
}: {
  customers: Customer[];
  materials: Material[];
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
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

  // Live weight estimate (uses density only; price + sell price are computed server-side on save)
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
        customer_id: customerId,
        material_id: materialId,
        finished_length_in: Number(finishedLen),
        area_in2: mode === "area" ? Number(areaIn2) : null,
        weight_lb_per_ft: mode === "wpf" ? Number(wpf) : null,
        eau_base: Number(eauBase),
      };

      const resp = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.error || "Error saving quote");
      }

      // Immediately redirect to quote detail page
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">Inputs</h2>

        <div className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300">Customer</label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Material</label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.family}
                  {m.grade ? ` — ${m.grade}` : ""} (density {Number(m.density_lb_in3).toFixed(6)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Finished length (in)</label>
            <input
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
              type="number"
              step="0.01"
              value={finishedLen}
              onChange={(e) => setFinishedLen(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Base EAU (pcs/year)</label>
            <input
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
              type="number"
              step="1"
              value={eauBase}
              onChange={(e) => setEauBase(Number(e.target.value))}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="radio" 
                checked={mode === "area"} 
                onChange={() => setMode("area")}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-slate-300">Use cross-section area (in²)</span>
            </label>

            {mode === "area" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 ml-7">Area (in²)</label>
                <input
                  className="mt-2 ml-7 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  type="number"
                  step="0.0001"
                  value={areaIn2}
                  onChange={(e) => setAreaIn2(Number(e.target.value))}
                />
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="radio" 
                checked={mode === "wpf"} 
                onChange={() => setMode("wpf")}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-slate-300">Use weight per foot (lb/ft)</span>
            </label>

            {mode === "wpf" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 ml-7">Weight per foot (lb/ft)</label>
                <input
                  className="mt-2 ml-7 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  type="number"
                  step="0.0001"
                  value={wpf}
                  onChange={(e) => setWpf(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          <button 
            type="button" 
            onClick={onSave} 
            disabled={saving}
            className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Quote"}
          </button>

          {msg && (
            <p className={msg === "Saved." ? "text-green-400" : "text-red-400"}>
              {msg}
            </p>
          )}

          {result && (
            <div className="mt-4 rounded-lg border border-indigo-800 bg-indigo-950/40 p-4">
              <p className="text-sm text-slate-300">
                Quote created: <span className="font-semibold text-indigo-400">{result.quote_number}</span>
              </p>

              <p className="mt-3">
                <a 
                  href={`/quotes/${result.quote_id}`} 
                  className="font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  View quote →
                </a>
              </p>

              <p className="mt-2 text-xs text-slate-500">
                ID: {result.quote_id}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">Live Preview</h2>
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
            <p className="text-sm text-slate-400">Weight per piece</p>
            <p className="mt-2 text-3xl font-bold text-indigo-400">
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
