"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteQuoteButton({ quoteId, quoteNumber }: { quoteId: string; quoteNumber: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete quote ${quoteNumber}? This action cannot be undone.`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to delete quote"); setLoading(false); return; }
      router.push("/quotes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleDelete} disabled={loading} className="aurora-btn-danger px-4 py-2 text-xs">
        {loading ? "Deleting\u2026" : "Delete Quote"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
