import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

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

export async function GET() {
  const { supa, error } = await requireAdmin();
  if (error) return error;

  const { data, error: qErr } = await supa
    .from("customers")
    .select("id, name, status, created_at, updated_at")
    .order("name", { ascending: true });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, customers: data || [] }, { status: 200 });
}

export async function POST(req: Request) {
  const { supa, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const name = String(body.name || "").trim();
  const status = String(body.status || "active").trim();

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!["active", "inactive"].includes(status)) {
    return NextResponse.json({ error: "status must be active or inactive" }, { status: 400 });
  }

  const { data, error: insErr } = await supa
    .from("customers")
    .insert({ name, status })
    .select("id, name, status")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, customer: data }, { status: 200 });
}
