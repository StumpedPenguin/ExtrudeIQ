"use client";

import { useEffect, useMemo, useState } from "react";

type Material = {
  id: string;
  family: string;
  grade: string | null;
  density_lb_in3: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

type MaterialPrice = {
  id: string;
  material_id: string;
  price_per_lb: number;
  effective_date: string;
  source: string | null;
  created_at?: string;
};

function money(n: number) {
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function MaterialsAdminClient() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  // Create material form
  const [newFamily, setNewFamily] = useState("");
  const [newGrade, setNewGrade] = useState("");
  const [newDensity, setNewDensity] = useState("0.035"); // common starting point; change as desired
  const [newActive, setNewActive] = useState(true);
  const [creating, setCreating] = useState(false);

  // Price management (per selected material)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prices, setPrices] = useState<MaterialPrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);

  const [pricePerLb, setPricePerLb] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [priceSource, setPriceSource] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  async function loadMaterials() {
    setLoading(true);
    setMsg(null);
    try {
      const resp = await fetch("/api/admin/materials");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to load materials");
      setMaterials(data.materials || []);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load materials");
    } finally {
      setLoading(false);
    }
  }

  async function loadPrices(materialId: string) {
    setPricesLoading(true);
    setMsg(null);
    try {
      const resp = await fetch(`/api/admin/materials/${materialId}/prices`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to load prices");
      setPrices(data.prices || []);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load prices");
    } finally {
      setPricesLoading(false);
    }
  }

  useEffect(() => {
    loadMaterials();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter((m) => {
      const s = `${m.family} ${m.grade || ""}`.toLowerCase();
      return s.includes(q);
    });
  }, [materials, query]);

  async function createMaterial() {
    setCreating(true);
    setMsg(null);
    try {
      const payload = {
        family: newFamily.trim(),
        grade: newGrade.trim() || null,
        density_lb_in3: Number(newDensity),
        active: !!newActive,
      };

      const resp = await fetch("/api/admin/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to create material");

      setNewFamily("");
      setNewGrade("");
      setNewDensity("0.035");
      setNewActive(true);

      await loadMaterials();
      setMsg("Material created.");
    } catch (e: any) {
      setMsg(e?.message || "Failed to create material");
    } finally {
      setCreating(false);
    }
  }

  async function saveMaterial(m: Material) {
    setMsg(null);
    try {
      const resp = await fetch(`/api/admin/materials/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family: m.family,
          grade: m.grade,
          density_lb_in3: m.density_lb_in3,
          active: m.active,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to update material");

      setMsg("Saved.");
      await loadMaterials();
    } catch (e: any) {
      setMsg(e?.message || "Failed to update material");
    }
  }

  async function addPrice() {
    if (!selectedId) return;

    setSavingPrice(true);
    setMsg(null);
    try {
      const payload = {
        price_per_lb: Number(pricePerLb),
        effective_date: effectiveDate,
        source: priceSource.trim() || null,
      };

      const resp = await fetch(`/api/admin/materials/${selectedId}/prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to add price");

      setPricePerLb("");
      setPriceSource("");

      await loadPrices(selectedId);
      setMsg("Price added.");
    } catch (e: any) {
      setMsg(e?.message || "Failed to add price");
    } finally {
      setSavingPrice(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      {/* Create material */}
      <div style={{ background: "white", borderRadius: 10, padding: 16, boxShadow: "0 4px 14px rgba(0,0,0,0.06)" }}>
        <h2 style={{ marginTop: 0 }}>Add material</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 140px 160px", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Family</span>
            <input
              value={newFamily}
              onChange={(e) => setNewFamily(e.target.value)}
              placeholder="PVC, HDPE, TPE..."
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Grade (optional)</span>
            <input
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
              placeholder="123A, 70D, etc."
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Density (lb/in³)</span>
            <input
              value={newDensity}
              onChange={(e) => setNewDensity(e.target.value)}
              placeholder="0.035"
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Active</span>
            <select
              value={newActive ? "true" : "false"}
              onChange={(e) => setNewActive(e.target.value === "true")}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>

          <div style={{ display: "grid", alignContent: "end" }}>
            <button
              type="button"
              onClick={createMaterial}
              disabled={creating || !newFamily.trim()}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {creating ? "Creating..." : "Add"}
            </button>
          </div>
        </div>

        {msg && (
          <p style={{ marginTop: 10, fontSize: 13, color: msg.includes("Failed") ? "#b91c1c" : "#166534" }}>
            {msg}
          </p>
        )}
      </div>

      {/* Materials + Prices */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
        {/* Materials list */}
        <div style={{ background: "white", borderRadius: 10, padding: 16, boxShadow: "0 4px 14px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <h2 style={{ marginTop: 0 }}>Materials</h2>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", width: 220 }}
              />
              <button type="button" onClick={loadMaterials} disabled={loading} style={{ padding: "8px 10px" }}>
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1fr 90px",
                padding: "10px 12px",
                background: "#f1f5f9",
                fontWeight: 700,
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div>Family</div>
              <div>Grade</div>
              <div>Density</div>
              <div>Active</div>
            </div>

            {filtered.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1fr 90px",
                  padding: "10px 12px",
                  borderBottom: "1px solid #f1f5f9",
                  alignItems: "center",
                  cursor: "pointer",
                  background: selectedId === m.id ? "#eff6ff" : "transparent",
                }}
                onClick={() => {
                  setSelectedId(m.id);
                  loadPrices(m.id);
                }}
                title="Click to manage prices"
              >
                <input
                  value={m.family}
                  onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, family: e.target.value } : x)))}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  value={m.grade || ""}
                  onChange={(e) =>
                    setMaterials((prev) =>
                      prev.map((x) => (x.id === m.id ? { ...x, grade: e.target.value.trim() || null } : x))
                    )
                  }
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  value={String(m.density_lb_in3)}
                  onChange={(e) =>
                    setMaterials((prev) =>
                      prev.map((x) =>
                        x.id === m.id ? { ...x, density_lb_in3: Number(e.target.value) } : x
                      )
                    )
                  }
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
                  onClick={(e) => e.stopPropagation()}
                />
                <select
                  value={m.active ? "true" : "false"}
                  onChange={(e) =>
                    setMaterials((prev) =>
                      prev.map((x) => (x.id === m.id ? { ...x, active: e.target.value === "true" } : x))
                    )
                  }
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>

                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveMaterial(m);
                    }}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      background: "white",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}

            {!loading && filtered.length === 0 && (
              <div style={{ padding: 12, opacity: 0.8 }}>No materials found.</div>
            )}
          </div>
        </div>

        {/* Prices panel */}
        <div style={{ background: "white", borderRadius: 10, padding: 16, boxShadow: "0 4px 14px rgba(0,0,0,0.06)" }}>
          <h2 style={{ marginTop: 0 }}>Material prices</h2>

          {!selectedId ? (
            <p style={{ opacity: 0.8 }}>Select a material to view/add prices.</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Price / lb</span>
                  <input
                    value={pricePerLb}
                    onChange={(e) => setPricePerLb(e.target.value)}
                    placeholder="2.15"
                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Effective date</span>
                  <input
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    type="date"
                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Source (optional)</span>
                  <input
                    value={priceSource}
                    onChange={(e) => setPriceSource(e.target.value)}
                    placeholder="Supplier quote / index"
                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={addPrice}
                disabled={savingPrice || !pricePerLb.trim()}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginBottom: 14,
                }}
              >
                {savingPrice ? "Saving..." : "Add price"}
              </button>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 140px 1fr",
                    padding: "10px 12px",
                    background: "#f1f5f9",
                    fontWeight: 700,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <div>Effective</div>
                  <div>Price / lb</div>
                  <div>Source</div>
                </div>

                {prices.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "140px 140px 1fr",
                      padding: "10px 12px",
                      borderBottom: "1px solid #f1f5f9",
                      alignItems: "center",
                    }}
                  >
                    <div>{p.effective_date}</div>
                    <div style={{ fontWeight: 700 }}>{money(Number(p.price_per_lb))}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{p.source || ""}</div>
                  </div>
                ))}

                {!pricesLoading && prices.length === 0 && (
                  <div style={{ padding: 12, opacity: 0.8 }}>No prices found for this material.</div>
                )}

                {pricesLoading && <div style={{ padding: 12, opacity: 0.8 }}>Loading prices…</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
