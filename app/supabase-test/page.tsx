"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

const supabase = createBrowserClient();


export default function SupabaseTestPage() {
  const [status, setStatus] = useState("Testing...");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) setStatus("Error: " + error.message);
      else setStatus("OK: Supabase reachable. Session: " + (data.session ? "present" : "none"));
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Supabase Connectivity Test</h1>
      <p>{status}</p>
    </main>
  );
}
