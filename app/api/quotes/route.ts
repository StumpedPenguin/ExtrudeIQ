import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createQuote, type NewQuoteInput } from "@/lib/quotes/createQuote";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const supa = await supabaseServer();
    const { data: authData, error: authErr } = await supa.auth.getUser();
    if (authErr || !authData.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const opportunityId = searchParams.get("opportunity_id");
    if (!opportunityId) {
      return NextResponse.json({ error: "opportunity_id is required" }, { status: 400 });
    }

    const { data, error } = await supa
      .from("quotes")
      .select("id, quote_number, status, created_at")
      .eq("opportunity_id", opportunityId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const supa = await supabaseServer();

    const { data: authData, error: authErr } = await supa.auth.getUser();
    if (authErr || !authData.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const input = (await req.json()) as NewQuoteInput;

    const result = await createQuote(supa as any, authData.user.id, input);
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 400 });
  }
}
