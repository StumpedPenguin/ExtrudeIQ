"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "admin" | "estimator" | "viewer";

type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
  created_at?: string;
  updated_at?: string;
};

type RowState = {
  roleDraft: Role;
  saving: boolean;
  savedMsg: string | null;
  errorMsg: string | null;
};

function isRole(x: any): x is Role {
  return x === "admin" || x === "estimator" || x === "viewer";
}

export default function AdminUsersClient() {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("estimator");
  const [msg, setMsg] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [query, setQuery] = useState("");

  const [rowState, setRowState] = useState<Record<string, RowState>>({});

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.email || "").toLowerCase().includes(q));
  }, [users, query]);

  function initRowState(rows: ProfileRow[]) {
    const next: Record<string, RowState> = {};
    for (const u of rows) {
      next[u.id] = {
        roleDraft: u.role,
        saving: false,
        savedMsg: null,
        errorMsg: null,
      };
    }
    setRowState(next);
  }

  async function loadUsers() {
    setLoadingUsers(true);
    setMsg(null);
    try {
      const resp = await fetch("/api/admin/users");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to load users");
      const rows: ProfileRow[] = (data.users || []).map((u: any) => ({
        id: String(u.id),
        email: u.email ?? null,
        name: u.name ?? null,
        role: isRole(u.role) ? u.role : "viewer",
        created_at: u.created_at,
        updated_at: u.updated_at,
      }));
      setUsers(rows);
      initRowState(rows);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function invite() {
    setInviting(true);
    setMsg(null);
    try {
      const resp = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Invite failed");

      setMsg(`Invited ${data.email} as ${data.role}.`);
      setEmail("");
      await loadUsers();
    } catch (e: any) {
      setMsg(e?.message || "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  function setRow(id: string, patch: Partial<RowState>) {
    setRowState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveRole(userId: string) {
    const state = rowState[userId];
    if (!state) return;

    setRow(userId, { saving: true, savedMsg: null, errorMsg: null });

    try {
      const resp = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: state.roleDraft }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to update role");

      // Update in-memory users list
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: state.roleDraft } : u))
      );

      setRow(userId, { saving: false, savedMsg: "Saved.", errorMsg: null });

      // clear saved message after a moment
      setTimeout(() => setRow(userId, { savedMsg: null }), 1500);
    } catch (e: any) {
      setRow(userId, { saving: false, errorMsg: e?.message || "Error", savedMsg: null });
    }
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      {/* Invite card */}
      <div
        style={{
          background: "white",
          borderRadius: 10,
          padding: 16,
          boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Invite user</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 160px", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Role</span>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            >
              <option value="admin">admin</option>
              <option value="estimator">estimator</option>
              <option value="viewer">viewer</option>
            </select>
          </label>

          <div style={{ display: "grid", alignContent: "end" }}>
            <button
              type="button"
              onClick={invite}
              disabled={inviting || !email.trim()}
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
              {inviting ? "Inviting..." : "Send invite"}
            </button>
          </div>
        </div>

        {msg && (
          <p
            style={{
              marginTop: 10,
              fontSize: 13,
              color: msg.startsWith("Invited") ? "#166534" : "#b91c1c",
            }}
          >
            {msg}
          </p>
        )}
      </div>

      {/* Users list */}
      <div
        style={{
          background: "white",
          borderRadius: 10,
          padding: 16,
          boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h2 style={{ marginTop: 0 }}>Users</h2>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search email…"
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                width: 240,
              }}
            />
            <button type="button" onClick={loadUsers} disabled={loadingUsers} style={{ padding: "8px 10px" }}>
              {loadingUsers ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 220px",
              padding: "10px 12px",
              background: "#f1f5f9",
              fontWeight: 700,
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div>Email</div>
            <div>Role</div>
          </div>

          {filteredUsers.map((u) => {
            const st = rowState[u.id];
            const roleDraft = st?.roleDraft ?? u.role;

            return (
              <div
                key={u.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 220px",
                  padding: "10px 12px",
                  borderBottom: "1px solid #f1f5f9",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 600 }}>{u.email || "—"}</div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select
                    value={roleDraft}
                    onChange={(e) => setRow(u.id, { roleDraft: e.target.value as Role, savedMsg: null, errorMsg: null })}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      minWidth: 140,
                    }}
                  >
                    <option value="admin">admin</option>
                    <option value="estimator">estimator</option>
                    <option value="viewer">viewer</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => saveRole(u.id)}
                    disabled={!!st?.saving || roleDraft === u.role}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      background: roleDraft === u.role ? "#f8fafc" : "white",
                      cursor: roleDraft === u.role ? "not-allowed" : "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {st?.saving ? "Saving..." : "Save"}
                  </button>

                  {st?.savedMsg && (
                    <span style={{ fontSize: 12, color: "#166534" }}>{st.savedMsg}</span>
                  )}
                  {st?.errorMsg && (
                    <span style={{ fontSize: 12, color: "#b91c1c" }}>{st.errorMsg}</span>
                  )}
                </div>
              </div>
            );
          })}

          {!loadingUsers && filteredUsers.length === 0 && (
            <div style={{ padding: 12, opacity: 0.8 }}>No users found.</div>
          )}
        </div>

        <p style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          Only admins can change roles. You cannot remove your own admin role.
        </p>
      </div>
    </section>
  );
}
