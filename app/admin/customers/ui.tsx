"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  name: string;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

export default function CustomersAdminClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  // Create customer form
  const [newName, setNewName] = useState("");
  const [newStatus, setNewStatus] = useState<"active" | "inactive">("active");
  const [creating, setCreating] = useState(false);

  async function loadCustomers() {
    setLoading(true);
    setMsg(null);
    try {
      const resp = await fetch("/api/admin/customers");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to load customers");
      setCustomers(data.customers || []);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, query]);

  async function createCustomer() {
    setCreating(true);
    setMsg(null);
    try {
      const payload = { name: newName.trim(), status: newStatus };

      const resp = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to create customer");

      setNewName("");
      setNewStatus("active");
      await loadCustomers();
      setMsg("Customer created.");
    } catch (e: any) {
      setMsg(e?.message || "Failed to create customer");
    } finally {
      setCreating(false);
    }
  }

  async function saveCustomer(c: Customer) {
    setMsg(null);
    try {
      const resp = await fetch(`/api/admin/customers/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: c.name,
          status: c.status,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to update customer");

      setMsg("Saved.");
      await loadCustomers();
    } catch (e: any) {
      setMsg(e?.message || "Failed to update customer");
    }
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      {/* Create customer */}
      <div style={{ background: "white", borderRadius: 10, padding: 16, boxShadow: "0 4px 14px rgba(0,0,0,0.06)" }}>
        <h2 style={{ marginTop: 0 }}>Add customer</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 180px 160px", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Customer name"
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Status</span>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>

          <div style={{ display: "grid", alignContent: "end" }}>
            <button
              type="button"
              onClick={createCustomer}
              disabled={creating || !newName.trim()}
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

      {/* Customers list */}
      <div style={{ background: "white", borderRadius: 10, padding: 16, boxShadow: "0 4px 14px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h2 style={{ marginTop: 0 }}>Customers</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", width: 240 }}
            />
            <button type="button" onClick={loadCustomers} disabled={loading} style={{ padding: "8px 10px" }}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 160px",
              padding: "10px 12px",
              background: "#f1f5f9",
              fontWeight: 700,
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div>Name</div>
            <div>Status</div>
          </div>

          {filtered.map((c) => (
            <div
              key={c.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px",
                padding: "10px 12px",
                borderBottom: "1px solid #f1f5f9",
                alignItems: "center",
              }}
            >
              <input
                value={c.name}
                onChange={(e) =>
                  setCustomers((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))
                }
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />

              <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
                <select
                  value={c.status}
                  onChange={(e) =>
                    setCustomers((prev) =>
                      prev.map((x) => (x.id === c.id ? { ...x, status: e.target.value as any } : x))
                    )
                  }
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", minWidth: 120 }}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>

                <button
                  type="button"
                  onClick={() => saveCustomer(c)}
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
            <div style={{ padding: 12, opacity: 0.8 }}>No customers found.</div>
          )}
        </div>
      </div>
    </section>
  );
}
