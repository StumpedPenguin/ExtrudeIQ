import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supa = await supabaseServer();
    const { data: authData } = await supa.auth.getUser();

    if (!authData.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only admins can invite
    const { data: profile, error: profErr } = await supa
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }
    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "estimator").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!["admin", "estimator", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // Invite user
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }

    const invitedId = invited.user?.id;
    if (!invitedId) {
      return NextResponse.json({ error: "Invite returned no user id" }, { status: 500 });
    }

    // Ensure profile row exists + role assigned
    // If the user already had a profile, update it; otherwise insert.
    const { error: upsertErr } = await admin
      .from("profiles")
      .upsert(
        {
          id: invitedId,
          role,
          email,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (upsertErr) {
      return NextResponse.json(
        { error: `Invited, but profile upsert failed: ${upsertErr.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        user_id: invitedId,
        email,
        role,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
