import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { logActivity } from "@/lib/crm/activities";

export const runtime = "nodejs";

async function requireAdmin() {
  const supa = await supabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) return { supa, userId: null as string | null, error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };

  const { data: me } = await supa.from("profiles").select("role").eq("id", auth.user.id).single();
  if (!me || me.role !== "admin") {
    return { supa, userId: auth.user.id, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supa, userId: auth.user.id, error: null };
}

// PATCH - Update quote status (with opportunity sync)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supa, userId, error: authError } = await requireAdmin();
    if (authError) return authError;
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const validStatuses = ["draft", "sent", "accepted", "won", "lost"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    // Fetch current quote
    const { data: quote, error: quoteErr } = await supa
      .from("quotes")
      .select("id, quote_number, status, account_id, opportunity_id")
      .eq("id", id)
      .single();

    if (quoteErr || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const oldStatus = quote.status;

    // Update quote status
    const { error: updateErr } = await supa
      .from("quotes")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // Sync status to linked opportunity
    if (quote.opportunity_id && (status === "won" || status === "lost")) {
      await supa
        .from("opportunities")
        .update({
          status: status as "won" | "lost",
          updated_at: new Date().toISOString(),
        })
        .eq("id", quote.opportunity_id);

      // Log opportunity status change activity
      if (quote.account_id) {
        await logActivity(supa as any, {
          account_id: quote.account_id,
          opportunity_id: quote.opportunity_id,
          quote_id: id,
          activity_type: "opportunity_status_changed",
          title: `Opportunity auto-updated to ${status}`,
          description: `Triggered by quote ${quote.quote_number} status change to ${status}`,
          created_by: userId,
        });
      }
    }

    // Log quote status change activity
    if (quote.account_id) {
      await logActivity(supa as any, {
        account_id: quote.account_id,
        opportunity_id: quote.opportunity_id || null,
        quote_id: id,
        activity_type: "quote_status_changed",
        title: `Quote ${quote.quote_number} status changed to ${status}`,
        description: `Changed from ${oldStatus} to ${status}`,
        created_by: userId,
      });
    }

    return NextResponse.json({ ok: true, status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supa, error: authError } = await requireAdmin();

    if (authError) return authError;

    // Delete quote and its revisions (cascade handled by DB or explicit delete)
    const { error: delRevErr } = await supa
      .from("quote_revisions")
      .delete()
      .eq("quote_id", id);

    if (delRevErr) {
      return NextResponse.json({ error: delRevErr.message }, { status: 400 });
    }

    const { error: delQuoteErr } = await supa
      .from("quotes")
      .delete()
      .eq("id", id);

    if (delQuoteErr) {
      return NextResponse.json({ error: delQuoteErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Quote deleted successfully" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
