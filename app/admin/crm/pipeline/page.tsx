'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PipelineStage {
  status: string;
  count: number;
  totalValue: number;
  expectedValue: number;
  opportunities: any[];
}

interface Summary {
  totalOpportunities: number;
  totalValue: number;
  totalExpectedValue: number;
  averageDealSize: number;
  winRate: number;
}

interface MonthlyForecast { month: string; estimated: number; weighted: number; count: number; }
interface TopDeal { id: string; name: string; status: string; estimated_value: number; probability_percent: number; weighted_value: number; expected_close_date?: string; account_name?: string; account_id?: string; }
interface AgingStage { status: string; avgDaysToClose: number; count: number; }
interface User { id: string; full_name: string | null; email: string | null; }

const stageNeon: Record<string, { accent: string; glow: string; bar: string; badge: string }> = {
  prospecting: { accent: '#3b82f6', glow: 'si-glow-blue', bar: 'bg-[#3b82f6]', badge: 'bg-[#3b82f6]/15 text-[#3b82f6]' },
  discovery:   { accent: '#06b6d4', glow: 'si-glow-cyan', bar: 'bg-[#06b6d4]', badge: 'bg-[#06b6d4]/15 text-[#06b6d4]' },
  proposal:    { accent: '#eab308', glow: 'si-glow-yellow', bar: 'bg-[#eab308]', badge: 'bg-[#eab308]/15 text-[#eab308]' },
  negotiation: { accent: '#f97316', glow: 'si-glow-orange', bar: 'bg-[#f97316]', badge: 'bg-[#f97316]/15 text-[#f97316]' },
  won:         { accent: '#22c55e', glow: 'si-glow-green', bar: 'bg-[#22c55e]', badge: 'bg-[#22c55e]/15 text-[#22c55e]' },
  lost:        { accent: '#ef4444', glow: 'si-glow-red', bar: 'bg-[#ef4444]', badge: 'bg-[#ef4444]/15 text-[#ef4444]' },
};

const stageLabel: Record<string, string> = {
  prospecting: 'Prospecting', discovery: 'Discovery', proposal: 'Proposal',
  negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
};

export default function SalesPipelineReportPage() {
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthlyForecast, setMonthlyForecast] = useState<MonthlyForecast[]>([]);
  const [topDeals, setTopDeals] = useState<TopDeal[]>([]);
  const [agingByStage, setAgingByStage] = useState<AgingStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState({ min_date: '', max_date: '', account_owner_ids: [] as string[], stage: '' });
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'forecast' | 'topDeals' | 'aging'>('pipeline');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users');
        if (res.ok) { const data = await res.json(); setUsers(data.users || []); }
      } catch (error) { console.error('Error fetching users:', error); }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchPipeline = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.min_date) params.append('min_date', filters.min_date);
        if (filters.max_date) params.append('max_date', filters.max_date);
        if (filters.account_owner_ids.length > 0) params.append('account_owner_ids', filters.account_owner_ids.join(','));
        if (filters.stage) params.append('stage', filters.stage);
        const res = await fetch(`/api/admin/crm/pipeline?${params}`);
        if (res.ok) { const data = await res.json(); setPipeline(data.pipeline); setSummary(data.summary); setMonthlyForecast(data.monthlyForecast || []); setTopDeals(data.topDeals || []); setAgingByStage(data.agingByStage || []); }
      } catch (error) { console.error('Error fetching pipeline:', error); }
      finally { setLoading(false); }
    };
    fetchPipeline();
  }, [filters]);

  const toggleOwner = (id: string) => {
    setFilters(prev => ({
      ...prev,
      account_owner_ids: prev.account_owner_ids.includes(id)
        ? prev.account_owner_ids.filter(oid => oid !== id)
        : [...prev.account_owner_ids, id],
    }));
  };

  const totalHeight = pipeline.reduce((sum, s) => sum + s.totalValue, 0);

  return (
    <div className="si-bg min-h-screen">
      {/* Header */}
      <header className="border-b border-white/[0.04] bg-[#070b14]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] flex items-center justify-center text-white font-bold text-sm">P</div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Sales Pipeline</h1>
                <Link href="/admin/crm/opportunities" className="text-xs text-[#06b6d4]/70 hover:text-[#06b6d4]">&larr; Opportunities</Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Filters */}
        <div className="si-card p-5 mb-8 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Min Close Date</label>
              <input type="date" value={filters.min_date} onChange={(e) => setFilters({ ...filters, min_date: e.target.value })} className="w-full rounded-lg border border-white/[0.06] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]/40 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all" style={{ colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Max Close Date</label>
              <input type="date" value={filters.max_date} onChange={(e) => setFilters({ ...filters, max_date: e.target.value })} className="w-full rounded-lg border border-white/[0.06] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]/40 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all" style={{ colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Stage</label>
              <select value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })} className="w-full rounded-lg border border-white/[0.06] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]/40 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all" style={{ colorScheme: 'dark' }}>
                <option value="" className="bg-[#0d1117] text-white">All Stages</option>
                <option value="prospecting" className="bg-[#0d1117] text-white">Prospecting</option>
                <option value="discovery" className="bg-[#0d1117] text-white">Discovery</option>
                <option value="proposal" className="bg-[#0d1117] text-white">Proposal</option>
                <option value="negotiation" className="bg-[#0d1117] text-white">Negotiation</option>
                <option value="won" className="bg-[#0d1117] text-white">Won</option>
                <option value="lost" className="bg-[#0d1117] text-white">Lost</option>
              </select>
            </div>
            <div className="relative z-30">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Account Owners</label>
              <button type="button" onClick={() => setShowOwnerDropdown(!showOwnerDropdown)} className="w-full rounded-lg border border-white/[0.06] bg-[#0d1117] px-3 py-2 text-sm text-left outline-none focus:border-[#3b82f6]/40 focus:ring-1 focus:ring-[#3b82f6]/20 transition-all">
                <span className={filters.account_owner_ids.length > 0 ? 'text-white' : 'text-slate-600'}>
                  {filters.account_owner_ids.length > 0 ? `${filters.account_owner_ids.length} selected` : 'All owners'}
                </span>
              </button>
              {showOwnerDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-white/10 bg-[#0d1117] max-h-60 overflow-y-auto" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                  {filters.account_owner_ids.length > 0 && (
                    <button onClick={() => setFilters({ ...filters, account_owner_ids: [] })} className="w-full px-3 py-2 text-xs text-left text-[#3b82f6] hover:bg-white/[0.04] border-b border-white/[0.04]">Clear all</button>
                  )}
                  {users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.04] cursor-pointer">
                      <input type="checkbox" checked={filters.account_owner_ids.includes(u.id)} onChange={() => toggleOwner(u.id)} className="h-3.5 w-3.5 accent-[#3b82f6]" />
                      {u.full_name || u.email}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="si-card si-glow-blue p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Total Opportunities</div>
              <div className="text-2xl font-black text-white tabular-nums">{summary.totalOpportunities}</div>
            </div>
            <div className="si-card si-glow-cyan p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Pipeline Value</div>
              <div className="text-2xl font-black text-white tabular-nums">${summary.totalValue >= 1000 ? `${(summary.totalValue / 1000).toFixed(0)}K` : summary.totalValue.toLocaleString()}</div>
            </div>
            <div className="si-card si-glow-green p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Expected Value</div>
              <div className="text-2xl font-black text-[#22c55e] tabular-nums">${summary.totalExpectedValue >= 1000 ? `${(summary.totalExpectedValue / 1000).toFixed(0)}K` : summary.totalExpectedValue.toLocaleString()}</div>
            </div>
            <div className="si-card si-glow-yellow p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Avg Deal Size</div>
              <div className="text-2xl font-black text-white tabular-nums">${summary.averageDealSize >= 1000 ? `${(summary.averageDealSize / 1000).toFixed(0)}K` : Math.round(summary.averageDealSize).toLocaleString()}</div>
            </div>
            <div className="si-card si-glow-orange p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Win Rate</div>
              <div className="text-2xl font-black text-white tabular-nums">{(summary.winRate * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex gap-1 mb-8 si-card p-1.5">
          {([
            { key: 'pipeline', label: 'Pipeline by Stage' },
            { key: 'forecast', label: 'Monthly Forecast' },
            { key: 'topDeals', label: 'Top Deals' },
            { key: 'aging', label: 'Stage Aging' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-[#3b82f6]/15 text-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="si-card p-16 text-center"><div className="text-slate-500">Loading pipeline data...</div></div>
        ) : pipeline.length === 0 ? (
          <div className="si-card p-16 text-center"><div className="text-slate-500">No opportunities in the pipeline</div></div>
        ) : (
          <>
            {/* Pipeline by Stage Tab */}
            {activeTab === 'pipeline' && (
              <>
            <div className="si-card p-8 mb-8">
              <h2 className="text-lg font-bold text-white mb-6">Pipeline by Stage</h2>
              <div className="flex items-end gap-3 h-64">
                {pipeline.map((stage) => {
                  const pct = totalHeight > 0 ? (stage.totalValue / totalHeight) * 100 : 0;
                  const barH = pct > 0 ? Math.max(8, pct) : 4;
                  const neon = stageNeon[stage.status] || stageNeon.prospecting;
                  return (
                    <div key={stage.status} className="flex-1 flex flex-col items-center group">
                      <div className="flex-1 relative w-full flex items-end justify-center mb-3">
                        <div className="relative w-full max-w-14">
                          {/* Value label */}
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold text-white tabular-nums whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            ${(stage.totalValue / 1000).toFixed(0)}K
                          </div>
                          {/* Bar */}
                          <div
                            className={`w-full ${neon.bar} rounded-t-md transition-all duration-500 relative`}
                            style={{ height: `${barH}%`, minHeight: '12px', boxShadow: `0 0 20px ${neon.accent}30, inset 0 1px 0 rgba(255,255,255,0.15)` }}
                          >
                            {/* Glow overlay */}
                            <div className="absolute inset-0 rounded-t-md opacity-30" style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 70%)` }} />
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-300">{stageLabel[stage.status] || stage.status}</div>
                      <div className="text-[10px] text-slate-500 tabular-nums">{stage.count} deals</div>
                      <div className="text-[10px] font-bold tabular-nums mt-0.5" style={{ color: neon.accent }}>${(stage.totalValue / 1000).toFixed(0)}K</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage Tables */}
            <div className="space-y-6">
              {pipeline.map((stage) => {
                const neon = stageNeon[stage.status] || stageNeon.prospecting;
                return (
                  <div key={stage.status} className="si-card overflow-hidden">
                    {/* Stage header */}
                    <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${neon.accent}08 0%, transparent 60%)` }}>
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: neon.accent, boxShadow: `0 0 8px ${neon.accent}60` }} />
                        <h3 className="text-sm font-bold text-white">{stageLabel[stage.status] || stage.status}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${neon.badge}`}>{stage.count}</span>
                      </div>
                      <div className="flex gap-6 text-xs">
                        <span className="text-slate-500">Value: <span className="text-white font-semibold tabular-nums">${(stage.totalValue / 1000).toFixed(0)}K</span></span>
                        <span className="text-slate-500">Expected: <span className="font-semibold tabular-nums" style={{ color: neon.accent }}>${(stage.expectedValue / 1000).toFixed(0)}K</span></span>
                      </div>
                    </div>

                    {stage.opportunities.length === 0 ? (
                      <div className="p-8 text-center text-slate-600 text-sm">No opportunities in this stage</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/[0.04]">
                              <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Opportunity</th>
                              <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Account</th>
                              <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Value</th>
                              <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Probability</th>
                              <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Expected</th>
                              <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Close Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stage.opportunities.map((opp: any, i: number) => {
                              const ev = ((opp.estimated_value || 0) * (opp.probability_percent || 0)) / 100;
                              return (
                                <tr key={opp.id} className={`border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'}`}>
                                  <td className="px-6 py-3.5 text-sm">
                                    <Link href={`/admin/crm/opportunities/${opp.id}`} className="font-medium hover:underline" style={{ color: neon.accent }}>{opp.name}</Link>
                                  </td>
                                  <td className="px-6 py-3.5 text-sm text-slate-400">
                                    {opp.accounts?.name ? <Link href={`/admin/crm/accounts/${opp.account_id}`} className="text-slate-300 hover:text-white hover:underline">{opp.accounts.name}</Link> : <span className="text-slate-600">&mdash;</span>}
                                  </td>
                                  <td className="px-6 py-3.5 text-sm text-right font-semibold text-white tabular-nums">${(opp.estimated_value || 0).toLocaleString()}</td>
                                  <td className="px-6 py-3.5 text-sm text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="w-14 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${opp.probability_percent || 0}%`, backgroundColor: neon.accent, boxShadow: `0 0 6px ${neon.accent}40` }} />
                                      </div>
                                      <span className="text-xs text-slate-400 tabular-nums w-8">{opp.probability_percent || 0}%</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3.5 text-sm text-right font-semibold tabular-nums" style={{ color: neon.accent }}>${ev.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                  <td className="px-6 py-3.5 text-sm text-right text-slate-500 tabular-nums">{opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : <span className="text-slate-600">&mdash;</span>}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

            {/* Monthly Forecast Tab */}
            {activeTab === 'forecast' && (
              <>
        {/* ─── Monthly Revenue Forecast ─── */}
        {!loading && monthlyForecast.length > 0 && (() => {
          const maxEst = Math.max(...monthlyForecast.map(m => m.estimated), 1);
          const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const fmtMonth = (m: string) => { const [y, mo] = m.split('-'); return `${monthNames[parseInt(mo) - 1]} ${y}`; };
          return (
            <div className="si-card p-8 mt-8">
              <h2 className="text-lg font-bold text-white mb-2">Monthly Revenue Forecast</h2>
              <p className="text-xs text-slate-500 mb-6">Estimated and weighted revenue by expected close month</p>
              <div className="flex items-end gap-2 h-56">
                {monthlyForecast.map((m) => {
                  const estPct = Math.max(4, (m.estimated / maxEst) * 100);
                  const wtdPct = Math.max(2, (m.weighted / maxEst) * 100);
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center group min-w-0">
                      <div className="flex-1 relative w-full flex items-end justify-center mb-2">
                        <div className="relative w-full max-w-12 flex items-end gap-px">
                          {/* Estimated bar */}
                          <div className="flex-1 bg-[#3b82f6] rounded-t-sm transition-all duration-500 relative" style={{ height: `${estPct}%`, minHeight: '6px', boxShadow: '0 0 12px #3b82f620' }}>
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white tabular-nums whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                              ${m.estimated >= 1000 ? `${(m.estimated / 1000).toFixed(0)}K` : m.estimated.toLocaleString()}
                            </div>
                          </div>
                          {/* Weighted bar */}
                          <div className="flex-1 bg-[#22c55e] rounded-t-sm transition-all duration-500" style={{ height: `${wtdPct}%`, minHeight: '4px', boxShadow: '0 0 12px #22c55e20' }} />
                        </div>
                      </div>
                      <div className="text-[9px] font-semibold text-slate-400 truncate w-full text-center">{fmtMonth(m.month)}</div>
                      <div className="text-[9px] text-slate-600 tabular-nums">{m.count} deals</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/[0.04]">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#3b82f6]" /><span className="text-xs text-slate-400">Estimated Value</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#22c55e]" /><span className="text-xs text-slate-400">Weighted Value (probability-adjusted)</span></div>
              </div>
            </div>
          );
        })()}
        {!loading && monthlyForecast.length === 0 && (
          <div className="si-card p-16 text-center"><div className="text-slate-500">No forecast data available</div></div>
        )}
              </>
            )}

            {/* Top Deals Tab */}
            {activeTab === 'topDeals' && (
              <>
        {!loading && topDeals.length > 0 && (
              <div className="si-card overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.04]" style={{ background: 'linear-gradient(135deg, #3b82f608 0%, transparent 60%)' }}>
                  <h3 className="text-sm font-bold text-white">Top Deals by Value</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.04]">
                        <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Deal</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Value</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Weighted</th>
                        <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDeals.map((d, i) => {
                        const neon = stageNeon[d.status] || stageNeon.prospecting;
                        return (
                          <tr key={d.id} className={`border-b border-white/[0.02] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
                            <td className="px-4 py-3 text-sm">
                              <Link href={`/admin/crm/opportunities/${d.id}`} className="font-medium text-[#3b82f6] hover:underline">{d.name}</Link>
                              {d.account_name && <div className="text-[10px] text-slate-500 mt-0.5">{d.account_name}</div>}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-white tabular-nums">${d.estimated_value.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-[#22c55e] tabular-nums">${Math.round(d.weighted_value).toLocaleString()}</td>
                            <td className="px-4 py-3 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${neon.badge}`}>{stageLabel[d.status] || d.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        {!loading && topDeals.length === 0 && (
          <div className="si-card p-16 text-center"><div className="text-slate-500">No deals data available</div></div>
        )}
              </>
            )}

            {/* Stage Aging Tab */}
            {activeTab === 'aging' && (
              <>
            {!loading && agingByStage.length > 0 && (() => {
              const maxDays = Math.max(...agingByStage.map(a => Math.abs(a.avgDaysToClose)), 1);
              return (
                <div className="si-card overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.04]" style={{ background: 'linear-gradient(135deg, #f9731608 0%, transparent 60%)' }}>
                    <h3 className="text-sm font-bold text-white">Avg Days to Close by Stage</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Positive = future close, Negative = overdue</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {agingByStage.map((a) => {
                      const neon = stageNeon[a.status] || stageNeon.prospecting;
                      const barW = Math.max(8, (Math.abs(a.avgDaysToClose) / maxDays) * 100);
                      const isOverdue = a.avgDaysToClose < 0;
                      return (
                        <div key={a.status}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: neon.accent }} />
                              <span className="text-xs font-semibold text-slate-300">{stageLabel[a.status] || a.status}</span>
                              <span className="text-[10px] text-slate-600">({a.count} deals)</span>
                            </div>
                            <span className={`text-xs font-bold tabular-nums ${isOverdue ? 'text-red-400' : 'text-white'}`}>
                              {isOverdue ? `${Math.abs(a.avgDaysToClose)}d overdue` : `${a.avgDaysToClose}d`}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${barW}%`, backgroundColor: isOverdue ? '#ef4444' : neon.accent, boxShadow: `0 0 8px ${isOverdue ? '#ef4444' : neon.accent}30` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
        {!loading && agingByStage.length === 0 && (
          <div className="si-card p-16 text-center"><div className="text-slate-500">No aging data available</div></div>
        )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
