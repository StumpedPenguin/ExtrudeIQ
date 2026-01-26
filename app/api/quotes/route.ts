import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createQuote, type NewQuoteInput } from "@/lib/quotes/createQuote";

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
