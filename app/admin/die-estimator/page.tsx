"use client";

import * as React from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";

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
  updated_at?: string;
  updated_by?: string | null;
};

const FIXED_ID = "00000000-0000-0000-0000-000000000001";

function n(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function DieEstimatorAdminPage() {
  const supabase = React.useMemo(() => createBrowserClient(), []);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  // Form state (strings for inputs)
  const [a0, setA0] = React.useState("0.2");
  const [k, setK] = React.useState("0.4");
  const [cavitySlope, setCavitySlope] = React.useState("0.35");
  const [lowBand, setLowBand] = React.useState("0.90");
  const [highBand, setHighBand] = React.useState("1.12");
  const [baseSolid, setBaseSolid] = React.useState("6000");
  const [baseHollow, setBaseHollow] = React.useState("9500");
  const [baseCoex, setBaseCoex] = React.useState("14000");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setOk(null);

    const { data, error: e } = await supabase
      .from("die_estimator_settings")
      .select("id,a0,k,cavity_slope,low_band,high_band,base_solid,base_hollow,base_coex,updated_at,updated_by")
      .eq("id", FIXED_ID)
      .maybeSingle();

    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setError(
        `No settings row found. Ensure die_estimator_settings contains id ${FIXED_ID} (seed it once in SQL).`
      );
      setLoading(false);
      return;
    }

    const s = data as SettingsRow;

    setA0(String(s.a0));
    setK(String(s.k));
    setCavitySlope(String(s.cavity_slope));
    setLowBand(String(s.low_band));
    setHighBand(String(s.high_band));
    setBaseSolid(String(s.base_solid));
    setBaseHollow(String(s.base_hollow));
    setBaseCoex(String(s.base_coex));

    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setOk(null);

    // Validate
    const a0v = n(a0);
    const kv = n(k);
    const cavv = n(cavitySlope);
    const lowv = n(lowBand);
    const highv = n(highBand);

    if (a0v <= 0) return fail("A0 must be > 0.");
    if (kv <= 0) return fail("K must be > 0.");
    if (cavv < 0) return fail("Cavity slope must be ≥ 0.");
    if (lowv <= 0 || lowv >= 2) return fail("Low band must be between 0 and 2.");
    if (highv <= 0 || highv >= 3) return fail("High band must be between 0 and 3.");
    if (highv <= lowv) return fail("High band must be greater than low band.");

    const solid = Math.max(0, Math.floor(n(baseSolid)));
    const hollow = Math.max(0, Math.floor(n(baseHollow)));
    const coex = Math.max(0, Math.floor(n(baseCoex)));

    // Optional updated_by tracking
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id ?? null;

    const { data, error: e } = await supabase
      .from("die_estimator_settings")
      .update({
        a0: a0v,
        k: kv,
        cavity_slope: cavv,
        low_band: lowv,
        high_band: highv,
        base_solid: solid,
        base_hollow: hollow,
        base_coex: coex,
        updated_by: userId,
      })
      .eq("id", FIXED_ID)
      .select("id,a0,k,cavity_slope,low_band,high_band,base_solid,base_hollow,base_coex,updated_at,updated_by")
      .single();

    if (e) {
      setError(e.message);
      setSaving(false);
      return;
    }

    // Re-sync form to saved values
    const s = data as SettingsRow;
    setA0(String(s.a0));
    setK(String(s.k));
    setCavitySlope(String(s.cavity_slope));
    setLowBand(String(s.low_band));
    setHighBand(String(s.high_band));
    setBaseSolid(String(s.base_solid));
    setBaseHollow(String(s.base_hollow));
    setBaseCoex(String(s.base_coex));

    setOk("Settings saved.");
    setSaving(false);
  }

  function fail(msg: string) {
    setError(msg);
    setSaving(false);
  }

  function resetToRecommended() {
    // Your requested starting point: K ~ 0.30–0.50
    setA0("0.2");
    setK("0.4");
    setCavitySlope("0.35");
    setLowBand("0.90");
    setHighBand("1.12");
    setBaseSolid("6000");
    setBaseHollow("9500");
    setBaseCoex("14000");
    setOk(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-indigo-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-indigo-950">
              Die Estimator Settings
            </h1>
            <p className="mt-1 text-sm text-indigo-800/80">
              Admin-only configuration for the Die Cost Estimator.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/tools/die-estimator"
              className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-900 shadow-sm hover:bg-indigo-50"
            >
              Open Estimator
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
          {/* Form */}
          <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-indigo-950">Configuration</h2>
              <button
                type="button"
                onClick={resetToRecommended}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-950 hover:bg-indigo-100"
              >
                Reset defaults
              </button>
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-indigo-900/70">Loading…</div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="A0 (baseline area in²)" value={a0} onChange={setA0} rightHint="in²" />
                <Field label="K (area sensitivity)" value={k} onChange={setK} />

                <Field label="Cavity slope" value={cavitySlope} onChange={setCavitySlope} />
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-900/80">
                    Estimator formula
                  </div>
                  <div className="mt-2 text-sm text-indigo-900">
                    Base × SizeFactor × CavityMultiplier
                  </div>
                  <div className="mt-1 text-xs text-indigo-900/70">
                    SizeFactor = 1 + K × max(0, (Area − A0) / A0)
                  </div>
                </div>

                <Field label="Low band" value={lowBand} onChange={setLowBand} rightHint="×" />
                <Field label="High band" value={highBand} onChange={setHighBand} rightHint="×" />

                <Field label="Base: Solid" value={baseSolid} onChange={setBaseSolid} rightHint="$" />
                <Field label="Base: Hollow" value={baseHollow} onChange={setBaseHollow} rightHint="$" />
                <Field label="Base: Co-ex" value={baseCoex} onChange={setBaseCoex} rightHint="$" />
              </div>
            )}

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                {error}
              </div>
            ) : null}

            {ok ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                {ok}
              </div>
            ) : null}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={loading || saving}
                onClick={save}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save settings"}
              </button>

              <button
                type="button"
                disabled={loading || saving}
                onClick={load}
                className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-950 shadow-sm hover:bg-indigo-50 disabled:opacity-60"
              >
                Reload
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-indigo-950">Preview</h2>
            <p className="mt-1 text-sm text-indigo-800/80">
              These values are applied immediately by the estimator page (read-only).
            </p>

            <div className="mt-4 space-y-2">
              <PreviewRow label="A0" value={a0} />
              <PreviewRow label="K" value={k} />
              <PreviewRow label="Cavity slope" value={cavitySlope} />
              <PreviewRow label="Low band" value={lowBand} />
              <PreviewRow label="High band" value={highBand} />
              <PreviewRow label="Base solid" value={baseSolid} />
              <PreviewRow label="Base hollow" value={baseHollow} />
              <PreviewRow label="Base co-ex" value={baseCoex} />
            </div>

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              If you get RLS errors here, confirm your UPDATE policy matches your admin role schema.
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-indigo-900/60">ExtrudeIQ • Admin</div>
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

function PreviewRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 p-3">
      <div className="text-sm text-indigo-900/80">{props.label}</div>
      <div className="text-sm font-medium text-indigo-950">{props.value}</div>
    </div>
  );
}
