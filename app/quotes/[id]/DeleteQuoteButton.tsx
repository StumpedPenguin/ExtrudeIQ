"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteQuoteButton({ quoteId, quoteNumber }: { quoteId: string; quoteNumber: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete quote ${quoteNumber}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete quote");
        setLoading(false);
        return;
      }

      // Redirect to quotes list after successful deletion
      router.push("/quotes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #fca5a5",
          background: "#fee2e2",
          color: "#991b1b",
          fontWeight: 600,
          fontSize: 13,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Deleting…" : "Delete Quote"}
      </button>
      {error && (
        <p style={{ marginTop: 8, color: "crimson", fontSize: 13 }}>
          {error}
        </p>
      )}
    </div>
  );
}
