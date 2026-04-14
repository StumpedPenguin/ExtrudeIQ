import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const supa = await supabaseServer();
    const { data: auth } = await supa.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(req.url);
    const account_id = url.searchParams.get("account_id");
    const opportunity_id = url.searchParams.get("opportunity_id");
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
    const offset = Number(url.searchParams.get("offset") || 0);

    let query = supa
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (account_id) {
      query = query.eq("account_id", account_id);
    }

    if (opportunity_id) {
      query = query.eq("opportunity_id", opportunity_id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ activities: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
