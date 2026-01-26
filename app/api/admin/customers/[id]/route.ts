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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supa, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const name = String(body.name || "").trim();
  const status = String(body.status || "").trim();

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!["active", "inactive"].includes(status)) {
    return NextResponse.json({ error: "status must be active or inactive" }, { status: 400 });
  }

  const { data, error: updErr } = await supa
    .from("customers")
    .update({ name, status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, status, updated_at")
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, customer: data }, { status: 200 });
}
