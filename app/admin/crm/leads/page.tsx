'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Lead {
  id: string;
  company_name: string;
  industry?: string;
  lead_source?: string;
  status: string;
  score: number;
  primary_contact_email?: string;
  created_at: string;
}

const industryOptions = [
  'Construction',
  'Doors and Windows',
  'Garage Doors',
  'Commercial Refridgeration',
  'Appliances',
  'Shower Doors',
  'Renewable Energy',
  'Office Furniture',
  'Recreational Vehicles',
  'Medical',
  'Lighting',
  'Lawn and Garden',
];

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 10);

  if (!digits) return '';
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    website: '',
    description: '',
    lead_source: 'inbound',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
  });

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: page.toString(), limit: '25' });
        if (status) params.append('status', status);
        else params.append('exclude_status', 'converted');
        if (search) params.append('search', search);
        const res = await fetch(`/api/admin/crm/leads?${params}`);
        if (res.ok) { const data = await res.json(); setLeads(data.leads); }
      } catch (error) { console.error('Error fetching leads:', error); }
      finally { setLoading(false); }
    };
    fetchLeads();
  }, [page, status, search]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ company_name: '', industry: '', website: '', description: '', lead_source: 'inbound', primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '' });
        setPage(1);
        const fetchRes = await fetch('/api/admin/crm/leads?page=1&limit=25');
        if (fetchRes.ok) { const data = await fetchRes.json(); setLeads(data.leads); }
      }
    } catch (error) { console.error('Error creating lead:', error); }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`/api/admin/crm/leads/${leadId}`, { method: 'DELETE' });
      if (res.ok) setLeads(leads.filter((l) => l.id !== leadId));
    } catch (error) { console.error('Error deleting lead:', error); }
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'negotiating', label: 'Negotiating' },
    { value: 'converted', label: 'Converted' },
    { value: 'lost', label: 'Lost' },
  ];

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      new: 'bg-aurora-blue/20 text-aurora-blue',
      contacted: 'bg-aurora-cyan/20 text-aurora-cyan',
      qualified: 'bg-aurora-teal/20 text-aurora-teal',
      proposal: 'bg-amber-500/20 text-amber-400',
      negotiating: 'bg-orange-500/20 text-orange-400',
      converted: 'bg-emerald-500/20 text-emerald-400',
      lost: 'bg-red-500/20 text-red-400',
    };
    return m[s] || 'bg-slate-500/20 text-slate-300';
  };

  return (
    <div className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-cyan flex items-center justify-center text-[#060918] font-bold text-sm">E</div>
              <h1 className="text-xl font-bold text-white tracking-tight">Leads</h1>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(true)} className="aurora-btn px-4 py-2 text-xs">+ New Lead</button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Filters */}
        <div className="glass-card p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Search</label>
              <input type="text" placeholder="Search by company, contact..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="aurora-input" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Status</label>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="aurora-select">
                {statusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* New Lead Modal */}
        {showForm && (
          <div className="aurora-overlay">
            <div className="glass-card glow-teal max-w-lg w-full p-6">
              <h2 className="text-xl font-bold mb-5 text-white">Create New Lead</h2>
              <form onSubmit={handleCreateLead} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Company Name *</label>
                  <input type="text" required value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} className="aurora-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Industry</label>
                  <select value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className="aurora-select">
                    <option value="">Select an industry</option>
                    {industryOptions.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Website</label>
                  <input type="text" inputMode="url" placeholder="abc123.com" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="aurora-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="aurora-input min-h-[88px]" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Lead Source</label>
                  <select value={formData.lead_source} onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })} className="aurora-select">
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                    <option value="referral">Referral</option>
                    <option value="website">Website</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Contact Name</label>
                  <input type="text" value={formData.primary_contact_name} onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })} className="aurora-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Contact Email</label>
                  <input type="email" value={formData.primary_contact_email} onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })} className="aurora-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Contact Phone</label>
                  <input type="tel" placeholder="(734) 693-4081" value={formData.primary_contact_phone} onChange={(e) => setFormData({ ...formData, primary_contact_phone: formatPhoneNumber(e.target.value) })} className="aurora-input" />
                </div>
                <div className="flex gap-3 pt-3">
                  <button type="submit" className="aurora-btn flex-1 py-2.5 text-sm">Create Lead</button>
                  <button type="button" onClick={() => setShowForm(false)} className="aurora-btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No leads found</div>
          ) : (
            <table className="aurora-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="font-medium text-white">{lead.company_name}</td>
                    <td>{lead.primary_contact_email || '-'}</td>
                    <td>{lead.lead_source || '-'}</td>
                    <td>
                      <select
                        value={lead.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            const res = await fetch(`/api/admin/crm/leads/${lead.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: newStatus }),
                            });
                            if (res.ok) {
                              if (newStatus === 'converted' && !status) {
                                setLeads(leads.filter((l) => l.id !== lead.id));
                              } else {
                                setLeads(leads.map((l) => l.id === lead.id ? { ...l, status: newStatus } : l));
                              }
                            }
                          } catch (err) { console.error('Error updating status:', err); }
                        }}
                        className={`aurora-badge ${statusColor(lead.status)} bg-transparent border-0 cursor-pointer text-xs font-semibold appearance-none pr-4`}
                        style={{ backgroundImage: 'none' }}
                      >
                        <option value="new">new</option>
                        <option value="contacted">contacted</option>
                        <option value="qualified">qualified</option>
                        <option value="proposal">proposal</option>
                        <option value="negotiating">negotiating</option>
                        <option value="converted">converted</option>
                        <option value="lost">lost</option>
                      </select>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                          <div className="bg-aurora-teal h-1.5 rounded-full" style={{ width: `${lead.score}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{lead.score}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-3">
                        {lead.status !== 'converted' && (
                          <button onClick={() => router.push(`/admin/crm/leads/${lead.id}/convert`)} className="text-xs font-semibold text-aurora-teal hover:text-aurora-teal/80">Convert</button>
                        )}
                        <button onClick={() => handleDeleteLead(lead.id)} className="text-xs font-semibold text-red-400 hover:text-red-300">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
