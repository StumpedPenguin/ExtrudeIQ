import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { email, password, redirectTo } = await req.json();

  const supa = await supabaseServer();
  const { error } = await supa.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({ success: true, redirectTo: redirectTo || "/dashboard" });
}
