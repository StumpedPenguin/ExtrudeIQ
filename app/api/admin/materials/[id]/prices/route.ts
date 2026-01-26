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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supa, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const { data, error: qErr } = await supa
    .from("material_prices")
    .select("id, material_id, price_per_lb, effective_date, source, created_at")
    .eq("material_id", id)
    .order("effective_date", { ascending: false });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, prices: data || [] }, { status: 200 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supa, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const price = Number(body.price_per_lb);
  const effective_date = String(body.effective_date || "").trim();
  const source = body.source ? String(body.source).trim() : null;

  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "price_per_lb must be > 0" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effective_date)) {
    return NextResponse.json({ error: "effective_date must be YYYY-MM-DD" }, { status: 400 });
  }

  const { data, error: insErr } = await supa
    .from("material_prices")
    .insert({
      material_id: id,
      price_per_lb: price,
      effective_date,
      source,
      created_by: null, // optional; you can set this later if you want
    })
    .select("id, material_id, price_per_lb, effective_date, source, created_at")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, price: data }, { status: 200 });
}
