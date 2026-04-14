'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Opportunity {
  id: string;
  name: string;
  status: string;
  estimated_value?: number;
  probability_percent: number;
  expected_close_date?: string;
  account_id: string;
  account_name?: string;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '', account_id: '' });
  const [page, setPage] = useState(1);
  const limit = 25;

  useEffect(() => {
    const fetchOpportunities = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.search) params.append('search', filters.search);
        if (filters.account_id) params.append('account_id', filters.account_id);
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        const res = await fetch(`/api/admin/crm/opportunities?${params}`);
        if (res.ok) { const data = await res.json(); setOpportunities(data.opportunities); }
      } catch (error) { console.error('Error fetching opportunities:', error); }
      finally { setLoading(false); }
    };
    fetchOpportunities();
  }, [filters, page]);

  const statuses = ['prospecting', 'discovery', 'proposal', 'negotiation', 'won', 'lost'];

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      prospecting: 'bg-aurora-blue/20 text-aurora-blue',
      discovery: 'bg-aurora-cyan/20 text-aurora-cyan',
      proposal: 'bg-amber-500/20 text-amber-400',
      negotiation: 'bg-orange-500/20 text-orange-400',
      won: 'bg-emerald-500/20 text-emerald-400',
      lost: 'bg-red-500/20 text-red-400',
    };
    return m[s] || 'bg-slate-500/20 text-slate-300';
  };

  const getStatusLabel = (s: string) => {
    const l: Record<string, string> = { prospecting: 'Prospecting', discovery: 'Discovery', proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost' };
    return l[s] || s;
  };

  const expectedValue = (opp: Opportunity) => {
    if (!opp.estimated_value) return 0;
    return (opp.estimated_value * (opp.probability_percent || 0)) / 100;
  };

  return (
    <div className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-cyan flex items-center justify-center text-[#060918] font-bold text-sm">E</div>
              <h1 className="text-xl font-bold text-white tracking-tight">Opportunities</h1>
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard" className="aurora-btn-secondary px-4 py-2 text-xs">Home</Link>
              <Link href="/admin/crm/opportunities/new" className="aurora-btn px-4 py-2 text-xs">+ New Opportunity</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Filters */}
        <div className="glass-card p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Status</label>
              <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }} className="aurora-select">
                <option value="">All Statuses</option>
                {statuses.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Search</label>
              <input type="text" placeholder="Search opportunities..." value={filters.search}
                onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }} className="aurora-input" />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="glass-card p-12 text-center text-slate-500">Loading opportunities...</div>
        ) : opportunities.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-500">No opportunities found</div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="aurora-table">
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Account</th>
                  <th>Status</th>
                  <th className="text-right">Value</th>
                  <th className="text-right">Expected Value</th>
                  <th>Close Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opp) => (
                  <tr key={opp.id}>
                    <td className="font-medium text-white">{opp.name}</td>
                    <td>
                      <Link href={`/admin/crm/accounts/${opp.account_id}`} className="text-aurora-teal hover:underline text-sm">
                        {opp.account_name || opp.account_id}
                      </Link>
                    </td>
                    <td><span className={`aurora-badge ${statusColor(opp.status)}`}>{getStatusLabel(opp.status)}</span></td>
                    <td className="text-right font-medium text-white">{opp.estimated_value ? `$${opp.estimated_value.toLocaleString()}` : '-'}</td>
                    <td className="text-right">
                      <div className="font-medium text-white">{opp.estimated_value ? `$${expectedValue(opp).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '-'}</div>
                      <div className="text-[10px] text-slate-500">{opp.probability_percent || 0}%</div>
                    </td>
                    <td>{opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : '-'}</td>
                    <td>
                      <Link href={`/admin/crm/opportunities/${opp.id}`} className="text-xs font-semibold text-aurora-teal hover:text-aurora-teal/80">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
