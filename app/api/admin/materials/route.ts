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
    .from("materials")
    .select("id, family, grade, density_lb_in3, active, created_at, updated_at")
    .order("family", { ascending: true });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, materials: data || [] }, { status: 200 });
}

export async function POST(req: Request) {
  const { supa, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const family = String(body.family || "").trim();
  const grade = body.grade ? String(body.grade).trim() : null;
  const density = Number(body.density_lb_in3);
  const active = body.active !== false;

  if (!family) return NextResponse.json({ error: "family is required" }, { status: 400 });
  if (!Number.isFinite(density) || density <= 0) {
    return NextResponse.json({ error: "density_lb_in3 must be > 0" }, { status: 400 });
  }

  const { data, error: insErr } = await supa
    .from("materials")
    .insert({ family, grade, density_lb_in3: density, active })
    .select("id, family, grade, density_lb_in3, active")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, material: data }, { status: 200 });
}
