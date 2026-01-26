// lib/quotes/recomputeRevision.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEauMoqTable, generateEauTiers } from "@/lib/quotes/pricing";

export async function recomputeFromInputs(
  supa: SupabaseClient,
  inputs: any
): Promise<{
  inputs_json: any;
  outputs_json: any;
  material_price_used: number;
  multiplier_used: number;
}> {
  const material_id = String(inputs.material_id || "");
  const finishedLen = Number(inputs.finished_length_in);
  const area = inputs.area_in2 ? Number(inputs.area_in2) : 0;
  const wpf = inputs.weight_lb_per_ft ? Number(inputs.weight_lb_per_ft) : 0;

  if (!material_id) throw new Error("inputs_json missing material_id");
  if (!Number.isFinite(finishedLen) || finishedLen <= 0) {
    throw new Error("inputs_json invalid finished_length_in");
  }
  if (!(area > 0) && !(wpf > 0)) {
    throw new Error("inputs_json must have area_in2 or weight_lb_per_ft");
  }
  if (area > 0 && wpf > 0) {
    throw new Error("inputs_json has both area_in2 and weight_lb_per_ft");
  }

  const eau_base = Number(inputs.eau_base || 1000);
  if (!Number.isFinite(eau_base) || eau_base <= 0) {
    throw new Error("inputs_json invalid eau_base");
  }

  // Material density
  const { data: mat, error: matErr } = await supa
    .from("materials")
    .select("density_lb_in3, family, grade")
    .eq("id", material_id)
    .single();

  if (matErr) throw new Error(matErr.message);

  // Latest effective price <= today
  const today = new Date().toISOString().slice(0, 10);
  const { data: priceRow, error: priceErr } = await supa
    .from("material_prices")
    .select("price_per_lb, effective_date")
    .eq("material_id", material_id)
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

  // Base pricing model
  const multiplier = 2.5;
  const basePrice = materialCost * multiplier;

  // Build EAU + MOQ tier table (NEW)
  const tiers = generateEauTiers(eau_base);
  const eau_moq_table = buildEauMoqTable({
    eau_base,
    tiers,
    price_base_per_piece: basePrice,
    material_cost_per_piece: materialCost,
  });

  const inputs_json = {
    ...inputs,
    eau_base,
    density_lb_in3: Number((mat as any).density_lb_in3),
    material_family: (mat as any).family,
    material_grade: (mat as any).grade,
    price_per_lb: pricePerLb,
    price_effective_date: (priceRow as any).effective_date,
  };

  const outputs_json = {
    weight_lb_per_piece: weightLb,
    material_cost_per_piece: materialCost,

    // keep legacy key for compatibility (if any)
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

  return {
    inputs_json,
    outputs_json,
    material_price_used: pricePerLb,
    multiplier_used: multiplier,
  };
}
