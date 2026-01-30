import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supa = await supabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) return { supa, error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };

  const { data: me } = await supa.from("profiles").select("role").eq("id", auth.user.id).single();
  if (!me || me.role !== "admin") {
    return { supa, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supa, error: null };
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supa, error: authError } = await requireAdmin();

    if (authError) return authError;

    // Delete quote and its revisions (cascade handled by DB or explicit delete)
    const { error: delRevErr } = await supa
      .from("quote_revisions")
      .delete()
      .eq("quote_id", id);

    if (delRevErr) {
      return NextResponse.json({ error: delRevErr.message }, { status: 400 });
    }

    const { error: delQuoteErr } = await supa
      .from("quotes")
      .delete()
      .eq("id", id);

    if (delQuoteErr) {
      return NextResponse.json({ error: delQuoteErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Quote deleted successfully" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
