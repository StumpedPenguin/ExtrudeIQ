"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "admin" | "estimator" | "viewer";
type ProfileRow = { id: string; email: string | null; name: string | null; role: Role; created_at?: string; updated_at?: string; };
type RowState = { roleDraft: Role; saving: boolean; savedMsg: string | null; errorMsg: string | null; };

function isRole(x: any): x is Role { return x === "admin" || x === "estimator" || x === "viewer"; }

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
    for (const u of rows) next[u.id] = { roleDraft: u.role, saving: false, savedMsg: null, errorMsg: null };
    setRowState(next);
  }

  async function loadUsers() {
    setLoadingUsers(true); setMsg(null);
    try {
      const resp = await fetch("/api/admin/users"); const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to load users");
      const rows: ProfileRow[] = (data.users || []).map((u: any) => ({ id: String(u.id), email: u.email ?? null, name: u.name ?? null, role: isRole(u.role) ? u.role : "viewer", created_at: u.created_at, updated_at: u.updated_at }));
      setUsers(rows); initRowState(rows);
    } catch (e: any) { setMsg(e?.message || "Failed to load users"); }
    finally { setLoadingUsers(false); }
  }

  useEffect(() => { loadUsers(); }, []);

  async function invite() {
    setInviting(true); setMsg(null);
    try {
      const resp = await fetch("/api/admin/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role: inviteRole }) });
      const data = await resp.json(); if (!resp.ok) throw new Error(data?.error || "Invite failed");
      setMsg(`Invited ${data.email} as ${data.role}.`); setEmail(""); await loadUsers();
    } catch (e: any) { setMsg(e?.message || "Invite failed"); }
    finally { setInviting(false); }
  }

  function setRow(id: string, patch: Partial<RowState>) { setRowState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })); }

  async function saveRole(userId: string) {
    const state = rowState[userId]; if (!state) return;
    setRow(userId, { saving: true, savedMsg: null, errorMsg: null });
    try {
      const resp = await fetch(`/api/admin/users/${userId}/role`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: state.roleDraft }) });
      const data = await resp.json(); if (!resp.ok) throw new Error(data?.error || "Failed to update role");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: state.roleDraft } : u)));
      setRow(userId, { saving: false, savedMsg: "Saved.", errorMsg: null });
      setTimeout(() => setRow(userId, { savedMsg: null }), 1500);
    } catch (e: any) { setRow(userId, { saving: false, errorMsg: e?.message || "Error", savedMsg: null }); }
  }

  const roleBadge: Record<string, string> = { admin: "bg-aurora-violet/20 text-aurora-violet", estimator: "bg-aurora-teal/20 text-aurora-teal", viewer: "bg-slate-500/20 text-slate-400" };

  return (
    <div className="space-y-6">
      {/* Invite card */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white mb-5">Invite User</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="aurora-input" /></div>
          <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Role</label><select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} className="aurora-select"><option value="admin">admin</option><option value="estimator">estimator</option><option value="viewer">viewer</option></select></div>
          <div className="flex items-end"><button type="button" onClick={invite} disabled={inviting || !email.trim()} className="aurora-btn w-full px-4 py-2.5 text-sm">{inviting ? "Inviting..." : "Send Invite"}</button></div>
        </div>
        {msg && <p className={`mt-3 text-xs ${msg.startsWith("Invited") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>}
      </div>

      {/* Users list */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white">Users</h2>
          <div className="flex gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email..." className="aurora-input !py-1.5 !text-xs w-52" />
            <button type="button" onClick={loadUsers} disabled={loadingUsers} className="aurora-btn-secondary px-3 py-1.5 text-xs">{loadingUsers ? "..." : "Refresh"}</button>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="grid grid-cols-[1fr_260px] gap-2 px-5 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</div>
          </div>

          {filteredUsers.map((u) => {
            const st = rowState[u.id];
            const roleDraft = st?.roleDraft ?? u.role;
            return (
              <div key={u.id} className="grid grid-cols-[1fr_260px] gap-2 px-5 py-3.5 border-b border-white/[0.03] items-center">
                <div className="text-sm font-medium text-white">{u.email || "\u2014"}</div>
                <div className="flex items-center gap-2">
                  <select value={roleDraft} onChange={(e) => setRow(u.id, { roleDraft: e.target.value as Role, savedMsg: null, errorMsg: null })} className="aurora-select !py-1.5 !text-xs flex-1">
                    <option value="admin">admin</option><option value="estimator">estimator</option><option value="viewer">viewer</option>
                  </select>
                  <button type="button" onClick={() => saveRole(u.id)} disabled={!!st?.saving || roleDraft === u.role} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${roleDraft === u.role ? "border border-white/[0.06] text-slate-600 cursor-not-allowed" : "aurora-btn"}`}>
                    {st?.saving ? "..." : "Save"}
                  </button>
                  {st?.savedMsg && <span className="text-[10px] text-emerald-400">{st.savedMsg}</span>}
                  {st?.errorMsg && <span className="text-[10px] text-red-400">{st.errorMsg}</span>}
                </div>
              </div>
            );
          })}

          {!loadingUsers && filteredUsers.length === 0 && <div className="p-4 text-sm text-slate-500">No users found.</div>}
        </div>
        <p className="mt-3 text-xs text-slate-600">Only admins can change roles. You cannot remove your own admin role.</p>
      </div>
    </div>
  );
}
