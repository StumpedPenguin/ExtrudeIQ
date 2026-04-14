import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityType =
  | "quote_created"
  | "quote_status_changed"
  | "quote_revision_created"
  | "contact_added"
  | "contact_removed"
  | "opportunity_created"
  | "opportunity_status_changed"
  | "lead_converted"
  | "account_created"
  | "account_updated"
  | "note";

export interface LogActivityParams {
  account_id: string;
  opportunity_id?: string | null;
  quote_id?: string | null;
  activity_type: ActivityType;
  title: string;
  description?: string | null;
  created_by: string;
}

export async function logActivity(
  supa: SupabaseClient,
  params: LogActivityParams
): Promise<void> {
  const { error } = await supa.from("activities").insert({
    account_id: params.account_id,
    opportunity_id: params.opportunity_id || null,
    quote_id: params.quote_id || null,
    activity_type: params.activity_type,
    title: params.title,
    description: params.description || null,
    created_by: params.created_by,
  });

  if (error) {
    // Log but don't throw — activity logging should not block primary operations
    console.error("Failed to log activity:", error.message);
  }
}
