import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { recomputeFromInputs } from "@/lib/quotes/recomputeRevision";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quote_id } = await params;
    const supa = await supabaseServer();

    // Auth check
    const { data: authData, error: authErr } = await supa.auth.getUser();
    if (authErr || !authData.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authData.user.id;

    // Role check
    const { data: profile, error: profErr } = await supa
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profErr) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    if (!["admin", "estimator"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load current revision
    const { data: current, error: curErr } = await supa
      .from("quote_revisions")
      .select("id, revision_number, inputs_json")
      .eq("quote_id", quote_id)
      .eq("is_current", true)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (curErr) {
      return NextResponse.json({ error: curErr.message }, { status: 400 });
    }

    if (!current) {
      return NextResponse.json({ error: "No current revision found" }, { status: 400 });
    }

    const nextRevisionNumber = Number(current.revision_number) + 1;

    // Recompute using latest material pricing
    const recomputed = await recomputeFromInputs(
      supa as any,
      current.inputs_json || {}
    );

    // Mark existing revision as not current
    const { error: updateErr } = await supa
      .from("quote_revisions")
      .update({ is_current: false })
      .eq("id", current.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // Insert new revision
    const { data: newRevision, error: insertErr } = await supa
      .from("quote_revisions")
      .insert({
        quote_id,
        revision_number: nextRevisionNumber,
        is_current: true,
        inputs_json: recomputed.inputs_json,
        outputs_json: recomputed.outputs_json,
        material_price_used: recomputed.material_price_used,
        multiplier_used: recomputed.multiplier_used,
        created_by: userId,
      })
      .select("id, revision_number")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        revision_id: newRevision.id,
        revision_number: newRevision.revision_number,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
