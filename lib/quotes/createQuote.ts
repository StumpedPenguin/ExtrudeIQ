// lib/quotes/createQuote.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEauMoqTable, generateEauTiers } from "@/lib/quotes/pricing";

export type NewQuoteInput = {
  customer_id: string;
  material_id: string;
  finished_length_in: number;
  area_in2?: number | null;
  weight_lb_per_ft?: number | null;

  // NEW
  eau_base?: number | null; // estimator-entered base EAU (pcs/year)
};

export type CreateQuoteResult = {
  quote_id: string;
  quote_number: string;
};

function makeQuoteNumber() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `Q-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rand}`;
}

export async function createQuote(
  supa: SupabaseClient,
  userId: string,
  input: NewQuoteInput
): Promise<CreateQuoteResult> {
  // Validation
  const finishedLen = Number(input.finished_length_in);
  const area = input.area_in2 ? Number(input.area_in2) : 0;
  const wpf = input.weight_lb_per_ft ? Number(input.weight_lb_per_ft) : 0;

  if (!input.customer_id) throw new Error("Customer is required");
  if (!input.material_id) throw new Error("Material is required");
  if (!Number.isFinite(finishedLen) || finishedLen <= 0) {
    throw new Error("Finished length must be > 0");
  }
  if (!(area > 0) && !(wpf > 0)) {
    throw new Error("Provide area (in²) or weight/ft (lb/ft)");
  }
  if (area > 0 && wpf > 0) {
    throw new Error("Provide only one: area OR weight/ft");
  }

  const eau_base = Number(input.eau_base || 1000);
  if (!Number.isFinite(eau_base) || eau_base <= 0) {
    throw new Error("Base EAU must be > 0");
  }

  // Role gate (RLS should also enforce)
  const { data: profile, error: profErr } = await supa
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profErr) throw new Error("Profile not found");
  if (!["admin", "estimator"].includes((profile as any).role)) {
    throw new Error("Forbidden");
  }

  // Material density
  const { data: mat, error: matErr } = await supa
    .from("materials")
    .select("density_lb_in3, family, grade")
    .eq("id", input.material_id)
    .single();

  if (matErr) throw new Error(matErr.message);

  // Latest effective price <= today
  const today = new Date().toISOString().slice(0, 10);
  const { data: priceRow, error: priceErr } = await supa
    .from("material_prices")
    .select("price_per_lb, effective_date")
    .eq("material_id", input.material_id)
    .lte("effective_date", today)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (priceErr) throw new Error(priceErr.message);
  if (!priceRow) throw new Error("No material price found (effective_date <= today)");

  // Compute weight
  let weightLb: number;
  if (area > 0) {
    weightLb = area * finishedLen * Number((mat as any).density_lb_in3);
  } else {
    weightLb = wpf * (finishedLen / 12);
  }

  const pricePerLb = Number((priceRow as any).price_per_lb);
  const materialCost = weightLb * pricePerLb;

  // Base pricing model (existing)
  const multiplier = 2.5;
  const basePrice = materialCost * multiplier; // P_base

  // Build EAU + MOQ tier table (NEW)
  const tiers = generateEauTiers(eau_base);

  const eau_moq_table = buildEauMoqTable({
    eau_base,
    tiers,
    price_base_per_piece: basePrice,
    material_cost_per_piece: materialCost,
    // Using defaults:
    // k=0.08, f_min=0.85, gp_min_order=500, setup_charge=250, moq_floor=500
  });

  // Insert quote (retry for collisions)
  let quoteId: string | null = null;
  let quoteNumber: string | null = null;

  for (let i = 0; i < 3; i++) {
    quoteNumber = makeQuoteNumber();

    const { data: q, error: qErr } = await supa
      .from("quotes")
      .insert({
        quote_number: quoteNumber,
        customer_id: input.customer_id,
        status: "draft",
        created_by: userId,
      })
      .select("id")
      .single();

    if (!qErr) {
      quoteId = (q as any).id;
      break;
    }

    const msg = (qErr.message || "").toLowerCase();
    if (!msg.includes("duplicate") && !msg.includes("unique")) {
      throw new Error(qErr.message);
    }
  }

  if (!quoteId || !quoteNumber) throw new Error("Could not generate unique quote number");

  const inputs_json = {
    customer_id: input.customer_id,
    material_id: input.material_id,
    finished_length_in: finishedLen,
    area_in2: area > 0 ? area : null,
    weight_lb_per_ft: wpf > 0 ? wpf : null,

    // NEW
    eau_base,

    // Audit / context
    density_lb_in3: Number((mat as any).density_lb_in3),
    material_family: (mat as any).family,
    material_grade: (mat as any).grade,
    price_per_lb: pricePerLb,
    price_effective_date: (priceRow as any).effective_date,
  };

  const outputs_json = {
    weight_lb_per_piece: weightLb,
    material_cost_per_piece: materialCost,

    // keep legacy key for compatibility with older UI (if any)
    sell_price_per_piece: basePrice,

    // NEW
    base_price_per_piece: basePrice,
    eau_base,
    eau_moq_config: {
      k: 0.08,
      f_min: 0.85,
      gp_min_order: 500,
      setup_charge: 250,
      moq_floor: 500,
    },
    eau_moq_table,
  };

  const { error: rErr } = await supa.from("quote_revisions").insert({
    quote_id: quoteId,
    revision_number: 1,
    is_current: true,
    inputs_json,
    outputs_json,
    material_price_used: pricePerLb,
    multiplier_used: multiplier,
    created_by: userId,
  });

  if (rErr) throw new Error(rErr.message);

  return { quote_id: quoteId, quote_number: quoteNumber };
}
