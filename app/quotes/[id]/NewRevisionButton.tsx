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
      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message || "Error");
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <button type="button" onClick={run} disabled={loading} className="aurora-btn px-4 py-2 text-xs">
        {loading ? "Creating..." : "New Revision"}
      </button>
      {msg && <span className="text-xs text-slate-400">{msg}</span>}
    </div>
  );
}
