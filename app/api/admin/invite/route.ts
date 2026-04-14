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
    const firstName = String(body.first_name || "").trim();
    const lastName = String(body.last_name || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!["admin", "estimator", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const fullName = `${firstName} ${lastName}`.trim();
    const metadata = {
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      role,
    };

    // Create the auth user through Supabase Auth and attach the profile metadata
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: metadata,
    });
    if (inviteErr) {
      const message = inviteErr.message || "Failed to create user";
      if (/database error saving new user/i.test(message)) {
        return NextResponse.json(
          { error: "Supabase Auth could not create the user profile. Apply the latest profiles migration and try again." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const invitedId = invited.user?.id;
    if (!invitedId) {
      return NextResponse.json({ error: "Invite returned no user id" }, { status: 500 });
    }

    // Ensure profile row exists + role assigned
    // If the auth trigger has not populated the row yet, this keeps the app in sync.
    const { error: upsertErr } = await admin
      .from("profiles")
      .upsert(
        {
          id: invitedId,
          role,
          email,
          full_name: fullName,
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
