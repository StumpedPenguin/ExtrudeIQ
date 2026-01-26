import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;

    const supa = await supabaseServer();
    const { data: authData } = await supa.auth.getUser();

    if (!authData.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only admins can change roles
    const { data: me, error: meErr } = await supa
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (meErr || !me) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }
    if (me.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const newRole = String(body.role || "").trim();

    if (!["admin", "estimator", "viewer"].includes(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Optional guardrail: prevent admin from demoting themselves (recommended)
    if (authData.user.id === targetUserId && newRole !== "admin") {
      return NextResponse.json(
        { error: "You cannot remove your own admin role." },
        { status: 400 }
      );
    }

    const { data: updated, error: updErr } = await supa
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", targetUserId)
      .select("id, email, role")
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
