"use client";

import * as React from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";



type DieType = "solid" | "hollow" | "coex";

function n(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function money(x: number): string {
  if (!Number.isFinite(x)) return "$0";
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

type SettingsRow = {
  id: string;
  a0: number;
  k: number;
  cavity_slope: number;
  low_band: number;
  high_band: number;
  base_solid: number;
  base_hollow: number;
  base_coex: number;
};

export default function DieEstimatorPage() {
  const supabase = React.useMemo(() => createBrowserClient(), []);

  // Inputs (MVP)
  const [dieType, setDieType] = React.useState<DieType>("solid");
  const [areaIn2, setAreaIn2] = React.useState<string>("0.20");
  const [cavities, setCavities] = React.useState<string>("1");

  // Settings (fallback defaults match what you had)
  const [settings, setSettings] = React.useState<SettingsRow>({
    id: "default",
    a0: 0.2,
    k: 0.4,
    cavity_slope: 0.35,
    low_band: 0.9,
    high_band: 1.12,
    base_solid: 6000,
    base_hollow: 9500,
    base_coex: 14000,
  });

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("die_estimator_settings")
        .select("id,a0,k,cavity_slope,low_band,high_band,base_solid,base_hollow,base_coex")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled && !error && data) {
        setSettings(data as SettingsRow);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Calculations
  const area = n(areaIn2);
  const cav = Math.max(1, Math.floor(n(cavities) || 1));

  const baseByType: Record<DieType, number> = {
    solid: settings.base_solid,
    hollow: settings.base_hollow,
    coex: settings.base_coex,
  };

  const base = baseByType[dieType];

  const sizeFactor = 1 + settings.k * Math.max(0, (area - settings.a0) / settings.a0);
  const cavityMult = 1 + settings.cavity_slope * (cav - 1);

  const expected = base * sizeFactor * cavityMult;
  const low = expected * settings.low_band;
  const high = expected * settings.high_band;

  const isValid = base > 0 && area > 0;

  return (
    <div className="min-h-screen bg-indigo-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-indigo-950">
              Die Cost Estimator
            </h1>
            <p className="mt-1 text-sm text-indigo-800/80">
              Stateless estimate using cross-sectional area.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin/die-estimator"
              className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-900 shadow-sm hover:bg-indigo-50"
            >
              Admin Settings
            </Link>
            <Link
              href="/quotes"
              className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-900 shadow-sm hover:bg-indigo-50"
            >
              Back to Quotes
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-indigo-950">Inputs</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Die type"
                value={dieType}
                onChange={(v) => setDieType(v as DieType)}
                options={[
                  ["solid", "Solid"],
                  ["hollow", "Hollow"],
                  ["coex", "Co-ex"],
                ]}
              />

              <Field label="Cavities" value={cavities} onChange={setCavities} rightHint="#" />

              <Field
                label="Cross-sectional area (in²)"
                value={areaIn2}
                onChange={setAreaIn2}
                rightHint="in²"
              />

              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-900/80">
                  How to get area
                </div>
                <div className="mt-2 text-sm text-indigo-900">
                  Pull from CAD “Section Properties → Area”.
                </div>
                <div className="mt-1 text-xs text-indigo-900/70">
                  Settings are loaded from Admin (if configured).
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
              Budgetary estimate only. Final tooling cost requires tooling/engineering review.
            </div>
          </div>

          {/* Outputs */}
          <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-indigo-950">Estimate</h2>

            <div className="mt-4 grid gap-4">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="text-sm font-medium text-indigo-900/80">
                  Estimated die cost range
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-indigo-950">
                  {isValid ? `${money(low)} – ${money(high)}` : "$0 – $0"}
                </div>
              </div>

              <Row label="Expected (midpoint)" value={money(expected)} />
              <Row label="Base (by die type)" value={money(base)} />

              <div className="rounded-xl border border-indigo-200 p-4">
                <div className="text-sm font-semibold text-indigo-950">Drivers</div>
                <div className="mt-3 grid gap-2 text-sm text-indigo-950">
                  <Row label="Area (in²)" value={area > 0 ? area.toFixed(3) : "0.000"} />
                  <Row label="Size factor" value={sizeFactor.toFixed(2)} />
                  <Row label="Cavity multiplier" value={cavityMult.toFixed(2)} />
                </div>
                <div className="mt-3 text-xs text-indigo-900/70">
                  Formula: Base × SizeFactor × CavityMultiplier
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                No inputs are saved. This page only reads admin settings.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-indigo-900/60">ExtrudeIQ • Die Cost Estimator</div>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rightHint?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-indigo-950">{props.label}</label>
      <div className="mt-1 relative">
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 pr-10 text-sm text-indigo-950 shadow-sm outline-none focus:border-indigo-300"
          inputMode="decimal"
        />
        {props.rightHint ? (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-indigo-900/60">
            {props.rightHint}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Select(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-indigo-950">{props.label}</label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-950 shadow-sm outline-none focus:border-indigo-300"
      >
        {props.options.map(([val, label]) => (
          <option key={val} value={val}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 p-3">
      <div className="text-sm text-indigo-900/80">{props.label}</div>
      <div className="text-sm font-medium text-indigo-950">{props.value}</div>
    </div>
  );
}
