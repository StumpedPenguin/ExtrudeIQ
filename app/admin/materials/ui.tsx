"use client";

import { useEffect, useMemo, useState } from "react";

type Material = { id: string; family: string; grade: string | null; density_lb_in3: number; active: boolean; created_at?: string; updated_at?: string; };
type MaterialPrice = { id: string; material_id: string; price_per_lb: number; effective_date: string; source: string | null; created_at?: string; };

function money(n: number) { if (!Number.isFinite(n)) return "-"; return n.toLocaleString(undefined, { style: "currency", currency: "USD" }); }

export default function MaterialsAdminClient() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [newFamily, setNewFamily] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [newDensity, setNewDensity] = useState("0.035");
  const [newActive, setNewActive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prices, setPrices] = useState<MaterialPrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricePerLb, setPricePerLb] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [priceSource, setPriceSource] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  async function loadMaterials() {
    setLoading(true); setMsg(null);
    try { const resp = await fetch("/api/admin/materials"); const data = await resp.json(); if (!resp.ok) throw new Error(data?.error || "Failed"); setMaterials(data.materials || []); }
    catch (e: any) { setMsg(e?.message || "Failed to load materials"); }
    finally { setLoading(false); }
  }

  async function loadPrices(materialId: string) {
    setPricesLoading(true); setMsg(null);
    try { const resp = await fetch(`/api/admin/materials/${materialId}/prices`); const data = await resp.json(); if (!resp.ok) throw new Error(data?.error || "Failed"); setPrices(data.prices || []); }
    catch (e: any) { setMsg(e?.message || "Failed to load prices"); }
    finally { setPricesLoading(false); }
  }

  useEffect(() => { loadMaterials(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter((m) => `${m.family} ${m.grade || ""}`.toLowerCase().includes(q));
  }, [materials, query]);

  async function createMaterial() {
    setCreating(true); setMsg(null);
    try {
      const payload = { family: newFamily.trim(), grade: newGrade.trim() || null, density_lb_in3: Number(newDensity), active: !!newActive };
      const resp = await fetch("/api/admin/materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await resp.json(); if (!resp.ok) throw new Error(data?.error || "Failed");
      setNewFamily(""); setNewGrade(""); setNewDensity("0.035"); setNewActive(true);
      await loadMaterials(); setMsg("Material created.");
    } catch (e: any) { setMsg(e?.message || "Failed to create material"); }
    finally { setCreating(false); }
  }

  async function saveMaterial(m: Material) {
    setMsg(null);
    try {
      const resp = await fetch(`/api/admin/materials/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ family: m.family, grade: m.grade, density_lb_in3: m.density_lb_in3, active: m.active }) });
      const data = await resp.json(); if (!resp.ok) throw new Error(data?.error || "Failed");
      setMsg("Saved."); await loadMaterials();
    } catch (e: any) { setMsg(e?.message || "Failed to update material"); }
  }

  async function addPrice() {
    if (!selectedId) return;
    setSavingPrice(true); setMsg(null);
    try {
      const payload = { price_per_lb: Number(pricePerLb), effective_date: effectiveDate, source: priceSource.trim() || null };
      const resp = await fetch(`/api/admin/materials/${selectedId}/prices`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await resp.json(); if (!resp.ok) throw new Error(data?.error || "Failed");
      setPricePerLb(""); setPriceSource(""); await loadPrices(selectedId); setMsg("Price added.");
    } catch (e: any) { setMsg(e?.message || "Failed to add price"); }
    finally { setSavingPrice(false); }
  }

  return (
    <div className="space-y-6">
      {/* Create material */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white mb-5">Add Material</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div><label className="block text-xs font-semibold text-slate-400 mb-1">Family</label><input value={newFamily} onChange={(e) => setNewFamily(e.target.value)} placeholder="PVC, HDPE..." className="aurora-input" /></div>
          <div><label className="block text-xs font-semibold text-slate-400 mb-1">Grade</label><input value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder="123A, 70D" className="aurora-input" /></div>
          <div><label className="block text-xs font-semibold text-slate-400 mb-1">Density (lb/in\u00b3)</label><input value={newDensity} onChange={(e) => setNewDensity(e.target.value)} className="aurora-input" /></div>
          <div><label className="block text-xs font-semibold text-slate-400 mb-1">Active</label><select value={newActive ? "true" : "false"} onChange={(e) => setNewActive(e.target.value === "true")} className="aurora-select"><option value="true">true</option><option value="false">false</option></select></div>
          <div className="flex items-end"><button type="button" onClick={createMaterial} disabled={creating || !newFamily.trim()} className="aurora-btn w-full px-4 py-2.5 text-sm">{creating ? "Creating..." : "Add"}</button></div>
        </div>
        {msg && <p className={`mt-3 text-xs ${msg.includes("Failed") || msg.includes("Error") ? "text-red-400" : "text-emerald-400"}`}>{msg}</p>}
      </div>

      {/* Materials + Prices */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 glass-card p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-white">Materials</h2>
            <div className="flex gap-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="aurora-input !py-1.5 !text-xs w-44" />
              <button type="button" onClick={loadMaterials} disabled={loading} className="aurora-btn-secondary px-3 py-1.5 text-xs">{loading ? "..." : "Refresh"}</button>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_80px] gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Family</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Grade</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Density</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active</div>
            </div>
            {filtered.map((m) => (
              <div key={m.id} className={`border-b border-white/[0.03] px-4 py-3 cursor-pointer transition-colors ${selectedId === m.id ? "bg-aurora-teal/5" : "hover:bg-white/[0.02]"}`} onClick={() => { setSelectedId(m.id); loadPrices(m.id); }}>
                <div className="grid grid-cols-[1.2fr_1fr_1fr_80px] gap-2 items-center">
                  <input value={m.family} onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, family: e.target.value } : x)))} onClick={(e) => e.stopPropagation()} className="aurora-input !py-1.5 !text-xs" />
                  <input value={m.grade || ""} onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, grade: e.target.value.trim() || null } : x)))} onClick={(e) => e.stopPropagation()} className="aurora-input !py-1.5 !text-xs" />
                  <input value={String(m.density_lb_in3)} onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, density_lb_in3: Number(e.target.value) } : x)))} onClick={(e) => e.stopPropagation()} className="aurora-input !py-1.5 !text-xs" />
                  <select value={m.active ? "true" : "false"} onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, active: e.target.value === "true" } : x)))} onClick={(e) => e.stopPropagation()} className="aurora-select !py-1.5 !text-xs">
                    <option value="true">true</option><option value="false">false</option>
                  </select>
                </div>
                <div className="flex justify-end mt-2">
                  <button type="button" onClick={(e) => { e.stopPropagation(); saveMaterial(m); }} className="aurora-btn-secondary px-3 py-1 text-[10px]">Save</button>
                </div>
              </div>
            ))}
            {!loading && filtered.length === 0 && <div className="p-4 text-sm text-slate-500">No materials found.</div>}
          </div>
        </div>

        {/* Prices panel */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-bold text-white mb-5">Prices</h2>
          {!selectedId ? <p className="text-sm text-slate-500">Select a material to view/add prices.</p> : (
            <>
              <div className="space-y-3 mb-4">
                <div><label className="block text-xs font-semibold text-slate-400 mb-1">Price / lb</label><input value={pricePerLb} onChange={(e) => setPricePerLb(e.target.value)} placeholder="2.15" className="aurora-input" /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1">Effective date</label><input value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} type="date" className="aurora-input" /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1">Source (optional)</label><input value={priceSource} onChange={(e) => setPriceSource(e.target.value)} placeholder="Supplier quote / index" className="aurora-input" /></div>
              </div>
              <button type="button" onClick={addPrice} disabled={savingPrice || !pricePerLb.trim()} className="aurora-btn w-full px-4 py-2.5 text-sm mb-5">{savingPrice ? "Saving..." : "Add price"}</button>

              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                <div className="grid grid-cols-3 gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Effective</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Price / lb</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Source</div>
                </div>
                {prices.map((p) => (
                  <div key={p.id} className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-white/[0.03] items-center">
                    <div className="text-sm text-slate-300">{p.effective_date}</div>
                    <div className="text-sm font-semibold text-aurora-teal">{money(Number(p.price_per_lb))}</div>
                    <div className="text-xs text-slate-500">{p.source || ""}</div>
                  </div>
                ))}
                {!pricesLoading && prices.length === 0 && <div className="p-4 text-sm text-slate-500">No prices found.</div>}
                {pricesLoading && <div className="p-4 text-sm text-slate-500">Loading prices...</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
