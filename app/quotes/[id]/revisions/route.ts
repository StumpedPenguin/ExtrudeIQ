import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { recomputeFromInputs } from "@/lib/quotes/recomputeRevision";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("POST /api/quotes/[id]/revisions hit");
  try {
    const { id: quote_id } = await params;
    const supa = await supabaseServer();

    const { data: authData, error: authErr } = await supa.auth.getUser();
    if (authErr || !authData.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = authData.user.id;

    // Role gate
    const { data: profile, error: profErr } = await supa
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profErr) return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    if (!["admin", "estimator"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load current revision
    const { data: cur, error: curErr } = await supa
      .from("quote_revisions")
      .select("id, revision_number, inputs_json")
      .eq("quote_id", quote_id)
      .eq("is_current", true)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (curErr) return NextResponse.json({ error: curErr.message }, { status: 400 });
    if (!cur) return NextResponse.json({ error: "No current revision found" }, { status: 400 });

    const nextRev = Number(cur.revision_number) + 1;

    // Recompute using latest price
    const recomputed = await recomputeFromInputs(supa as any, cur.inputs_json || {});

    // Transaction-like sequencing (Supabase JS doesn't do multi-statement transactions easily via client;
    // this is fine for MVP; if you want hard atomicity later, we can move to an RPC function.)
    // 1) Mark old current as false
    const { error: updErr } = await supa
      .from("quote_revisions")
      .update({ is_current: false })
      .eq("id", cur.id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

    // 2) Insert new revision as current
    const { data: newRevRow, error: insErr } = await supa
      .from("quote_revisions")
      .insert({
        quote_id,
        revision_number: nextRev,
        is_current: true,
        inputs_json: recomputed.inputs_json,
        outputs_json: recomputed.outputs_json,
        material_price_used: recomputed.material_price_used,
        multiplier_used: recomputed.multiplier_used,
        created_by: userId,
      })
      .select("id, revision_number")
      .single();

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

    return NextResponse.json(
      { ok: true, revision_number: newRevRow.revision_number, revision_id: newRevRow.id },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
