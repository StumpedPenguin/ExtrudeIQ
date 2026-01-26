"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

const supabase = createBrowserClient();

export default function DashboardPage() {
  const [status, setStatus] = useState("Checking session...");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setStatus("Error: " + error.message);
        return;
      }
      if (!data.session) {
        window.location.href = "/login";
        return;
      }
      setStatus("Signed in as: " + data.session.user.email);
    })();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>{status}</p>
      <button onClick={logout} style={{ padding: 10, marginTop: 12 }}>
        Sign out
      </button>
    </main>
  );
}
