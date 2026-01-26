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
    <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 16 }}>
      <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
        <h2>Inputs</h2>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <label>
            Customer
            <select
              style={{ width: "100%", padding: 8, marginTop: 6 }}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Material
            <select
              style={{ width: "100%", padding: 8, marginTop: 6 }}
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
          </label>

          <label>
            Finished length (in)
            <input
              style={{ width: "100%", padding: 8, marginTop: 6 }}
              type="number"
              step="0.01"
              value={finishedLen}
              onChange={(e) => setFinishedLen(Number(e.target.value))}
            />
          </label>

          <label>
              Base EAU (pcs/year)
              <input
                style={{ width: "100%", padding: 8, marginTop: 6 }}
                type="number"
                step="1"
                value={eauBase}
                onChange={(e) => setEauBase(Number(e.target.value))}
              />
            </label>


          <label style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input type="radio" checked={mode === "area"} onChange={() => setMode("area")} />
            Use cross-section area (in²)
          </label>

          {mode === "area" && (
            <label>
              Area (in²)
              <input
                style={{ width: "100%", padding: 8, marginTop: 6 }}
                type="number"
                step="0.0001"
                value={areaIn2}
                onChange={(e) => setAreaIn2(Number(e.target.value))}
              />
            </label>
          )}

          <label style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input type="radio" checked={mode === "wpf"} onChange={() => setMode("wpf")} />
            Use weight per foot (lb/ft)
          </label>

          {mode === "wpf" && (
            <label>
              Weight per foot (lb/ft)
              <input
                style={{ width: "100%", padding: 8, marginTop: 6 }}
                type="number"
                step="0.0001"
                value={wpf}
                onChange={(e) => setWpf(Number(e.target.value))}
              />
            </label>
          )}

          <button type="button" onClick={onSave} disabled={saving} style={{ padding: 10, marginTop: 6 }}>
            {saving ? "Saving..." : "Save Quote"}
          </button>

          {msg && <p style={{ color: msg === "Saved." ? "green" : "crimson" }}>{msg}</p>}

{result && (
  <div style={{ marginTop: 8 }}>
    <p style={{ margin: 0 }}>
      Quote created: <b>{result.quote_number}</b>
    </p>

    <p style={{ margin: "6px 0 0 0" }}>
      <a href={`/quotes/${result.quote_id}`} style={{ fontWeight: 600 }}>
        View quote
      </a>
    </p>

    <p style={{ margin: "6px 0 0 0", fontSize: 12, opacity: 0.75 }}>
      ID: {result.quote_id}
    </p>
  </div>
)}

        </div>
      </div>

      <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
        <h2>Live preview</h2>
        <p style={{ marginTop: 12 }}>
          Weight per piece (lb): <b>{weightPreviewLb.toFixed(4)}</b>
        </p>
        <p style={{ opacity: 0.75 }}>
          Material price and per-piece price are calculated on save using the latest effective material price in the
          database.
        </p>
      </div>
    </section>
  );
}
