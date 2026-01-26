export type EauMoqTier = {
  eau: number;
  factor: number;              // <= 1.0 (never above base)
  discount_pct: number;        // e.g., 7.25 means -7.25%
  price_per_piece: number;     // adjusted sell price / pc
  gross_profit_per_piece: number;
  moq_pieces: number;
  notes?: string | null;
};

export type EauMoqConfig = {
  k: number;           // curve aggressiveness
  f_min: number;       // max discount floor (e.g., 0.85)
  gp_min_order: number;
  setup_charge: number;
  moq_floor: number;
};

export const DEFAULT_EAU_MOQ_CONFIG: EauMoqConfig = {
  k: 0.08,
  f_min: 0.85,
  gp_min_order: 500,
  setup_charge: 250,
  moq_floor: 500,
};

export function generateEauTiers(eauBase: number): number[] {
  const base = Math.max(1, Math.floor(Number(eauBase) || 0));
  // As requested: base then common steps
  // If base is already above a step, we still include base and larger steps.
  const common = [5000, 10000, 20000, 50000, 100000];
  const tiers = [base, ...common.filter((x) => x !== base)];

  // Ensure strictly increasing unique list
  const uniq = Array.from(new Set(tiers)).sort((a, b) => a - b);

  // If base > 2000, also add a few “nice” multiples above base
  if (base > 2000) {
    const extras = [Math.round(base * 2), Math.round(base * 5), Math.round(base * 10)]
      .map((x) => roundNice(x));
    for (const x of extras) uniq.push(x);
  }

  return Array.from(new Set(uniq)).sort((a, b) => a - b);
}

function roundNice(n: number): number {
  // rounds to a “nice” step (5k / 10k / 20k style)
  if (n <= 10000) return Math.ceil(n / 1000) * 1000;
  if (n <= 50000) return Math.ceil(n / 5000) * 5000;
  return Math.ceil(n / 10000) * 10000;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function buildEauMoqTable(args: {
  eau_base: number;
  tiers: number[];
  price_base_per_piece: number;   // P_base
  material_cost_per_piece: number; // C_mat
  config?: Partial<EauMoqConfig>;
}): EauMoqTier[] {
  const cfg: EauMoqConfig = { ...DEFAULT_EAU_MOQ_CONFIG, ...(args.config || {}) };

  const eauBase = Math.max(1, Math.floor(Number(args.eau_base) || 1));
  const Pbase = Number(args.price_base_per_piece) || 0;
  const Cmat = Number(args.material_cost_per_piece) || 0;

  return args.tiers.map((eau) => {
    const E = Math.max(1, Math.floor(Number(eau) || 1));

    // Factor: never above 1.0, never below f_min
    let factor = Math.pow(eauBase / E, cfg.k);
    factor = clamp(factor, cfg.f_min, 1.0);

    const P = Pbase * factor;
    const GPpp = P - Cmat;

    let moq: number;
    let notes: string | null = null;

    if (!Number.isFinite(GPpp) || GPpp <= 0) {
      moq = cfg.moq_floor;
      notes = "Tier not allowed: margin too low at this price.";
    } else {
      moq = Math.ceil((cfg.setup_charge + cfg.gp_min_order) / GPpp);
      moq = Math.max(cfg.moq_floor, moq);

      // Useful warning: MOQ > assumed annual volume
      if (moq > E) {
        notes = "MOQ exceeds EAU assumption.";
      }
    }

    const discountPct = (1 - factor) * 100;

    return {
      eau: E,
      factor: Number(factor.toFixed(6)),
      discount_pct: Number(discountPct.toFixed(2)),
      price_per_piece: Number(P.toFixed(6)),
      gross_profit_per_piece: Number(GPpp.toFixed(6)),
      moq_pieces: moq,
      notes,
    };
  });
}
