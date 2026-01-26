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

  const family = String(body.family || "").trim();
  const grade = body.grade ? String(body.grade).trim() : null;
  const density = Number(body.density_lb_in3);
  const active = !!body.active;

  if (!family) return NextResponse.json({ error: "family is required" }, { status: 400 });
  if (!Number.isFinite(density) || density <= 0) {
    return NextResponse.json({ error: "density_lb_in3 must be > 0" }, { status: 400 });
  }

  const { data, error: updErr } = await supa
    .from("materials")
    .update({
      family,
      grade,
      density_lb_in3: density,
      active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, family, grade, density_lb_in3, active, updated_at")
    .single();

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, material: data }, { status: 200 });
}
