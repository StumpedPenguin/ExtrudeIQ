"use client";

import { useState } from "react";

export default function NewRevisionButton({ quoteId }: { quoteId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const resp = await fetch(`/api/quotes/${quoteId}/revisions`, { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to create revision");
      setMsg(`Revision ${data.revision_number} created.`);
      // reload to show the new current revision
      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message || "Error");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <button type="button" onClick={run} disabled={loading} style={{ padding: "8px 12px" }}>
        {loading ? "Creating..." : "New Revision"}
      </button>
      {msg && <span style={{ fontSize: 12, opacity: 0.8 }}>{msg}</span>}
    </div>
  );
}
