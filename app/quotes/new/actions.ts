"use server";

import { supabaseServer } from "@/lib/supabase/server";

type NewQuoteInput = {
  customer_id: string;
  material_id: string;
  finished_length_in: number;
  area_in2?: number | null;
  weight_lb_per_ft?: number | null;
};

function makeQuoteNumber() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000); // 4-digit
  return `Q-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rand}`;
}

export async function createNewQuote(input: NewQuoteInput) {
  const supa = supabaseServer();

  // Auth check
  const { data: authData, error: authErr } = await (await supa).auth.getUser();
  if (authErr || !authData.user) throw new Error("Not authenticated");

  const userId = authData.user.id;

  // Optional role check (keeps you aligned with RLS intent)
  const { data: profile, error: profErr } = await (await supa)
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profErr) throw new Error("Profile not found");
  if (!["admin", "estimator"].includes(profile.role)) throw new Error("Forbidden");

  // Basic validation
  const finishedLen = Number(input.finished_length_in);
  if (!input.customer_id) throw new Error("Customer is required");
  if (!input.material_id) throw new Error("Material is required");
  if (!Number.isFinite(finishedLen) || finishedLen <= 0) throw new Error("Finished length must be > 0");

  const area = input.area_in2 ? Number(input.area_in2) : 0;
  const wpf = input.weight_lb_per_ft ? Number(input.weight_lb_per_ft) : 0;

  if (!(area > 0) && !(wpf > 0)) throw new Error("Provide area (in²) or weight/ft (lb/ft)");
  if (area > 0 && wpf > 0) throw new Error("Provide only one: area OR weight/ft");

  // Get material density
  const { data: mat, error: matErr } = await (await supa)
    .from("materials")
    .select("density_lb_in3, family, grade")
    .eq("id", input.material_id)
    .single();

  if (matErr) throw new Error(matErr.message);

  // Get latest effective material price (<= today)
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const { data: priceRow, error: priceErr } = await (await supa)
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
    weightLb = area * finishedLen * Number(mat.density_lb_in3);
  } else {
    weightLb = wpf * (finishedLen / 12);
  }

  const pricePerLb = Number(priceRow.price_per_lb);
  const materialCost = weightLb * pricePerLb;
  const multiplier = 2.5;
  const sellPrice = materialCost * multiplier;

  // Insert quote with retry to avoid quote_number collisions
  let quoteId: string | null = null;
  let quoteNumber: string | null = null;

  for (let i = 0; i < 3; i++) {
    quoteNumber = makeQuoteNumber();

    const { data: q, error: qErr } = await (await supa)
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
      quoteId = q.id;
      break;
    }

    // If unique constraint hit, retry; otherwise fail
    const msg = qErr.message || "";
    if (!msg.toLowerCase().includes("duplicate") && !msg.toLowerCase().includes("unique")) {
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
    density_lb_in3: Number(mat.density_lb_in3),
    material_family: mat.family,
    material_grade: mat.grade,
    price_per_lb: pricePerLb,
    price_effective_date: priceRow.effective_date,
  };

  const outputs_json = {
    weight_lb_per_piece: weightLb,
    material_cost_per_piece: materialCost,
    sell_price_per_piece: sellPrice,
  };

  const { error: rErr } = await (await supa).from("quote_revisions").insert({
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
