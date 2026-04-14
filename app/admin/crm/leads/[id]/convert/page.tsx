'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Lead { id: string; company_name: string; industry?: string; website?: string; lead_source?: string; primary_contact_name?: string; primary_contact_email?: string; primary_contact_phone?: string; status: string; score?: number; }

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

export default function ConvertLeadPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    account_name: '', account_type: 'prospect', industry: '', website: '', phone: '',
    create_opportunity: false, opportunity_name: '', estimated_value: '', probability_percent: 25, expected_close_date: ''
  });

  useEffect(() => {
    const fetchLead = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/crm/leads/${leadId}`);
        if (res.ok) {
          const data = await res.json();
          setLead(data);
          setForm((prev) => ({
            ...prev,
            account_name: data.company_name || '',
            industry: data.industry || '',
            website: data.website || '',
            phone: data.primary_contact_phone ? formatPhoneNumber(data.primary_contact_phone) : '',
            opportunity_name: `${data.company_name} - New Opportunity`,
          }));
        }
      } catch (err) { console.error('Error fetching lead:', err); }
      finally { setLoading(false); }
    };
    if (leadId) fetchLead();
  }, [leadId]);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setConverting(true); setError('');
    try {
      const body: Record<string, unknown> = {
        account_name: form.account_name, account_type: form.account_type,
        industry: form.industry || undefined, website: form.website || undefined, phone: form.phone || undefined
      };
      if (form.create_opportunity) {
        body.opportunity = { name: form.opportunity_name, estimated_value: form.estimated_value ? Number(form.estimated_value) : undefined, probability_percent: form.probability_percent, expected_close_date: form.expected_close_date || undefined };
      }
      const res = await fetch(`/api/admin/crm/leads/${leadId}/convert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { const data = await res.json(); router.push(`/admin/crm/accounts/${data.account.id}`); }
      else { const d = await res.json(); setError(d.error || 'Conversion failed'); }
    } catch (err) { setError('Network error'); console.error(err); }
    finally { setConverting(false); }
  };

  if (loading) return <div className="aurora-bg min-h-screen flex items-center justify-center"><div className="text-slate-500">Loading lead...</div></div>;
  if (!lead) return <div className="aurora-bg min-h-screen flex items-center justify-center"><div className="text-slate-500">Lead not found</div></div>;

  return (
    <div className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-8 py-5">
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-aurora-teal flex items-center justify-center text-[#060918] font-bold text-sm">\u2705</div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Convert Lead</h1>
              <Link href="/admin/crm/leads" className="text-xs text-aurora-teal/70 hover:text-aurora-teal">\u2190 Back to Leads</Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-8 py-8">
        {/* Lead info */}
        <div className="glass-card glow-teal p-6 mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Lead Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Company:</span> <span className="text-white font-medium ml-1">{lead.company_name}</span></div>
            {lead.primary_contact_name && <div><span className="text-slate-500">Contact:</span> <span className="text-white font-medium ml-1">{lead.primary_contact_name}</span></div>}
            {lead.primary_contact_email && <div><span className="text-slate-500">Email:</span> <span className="text-white font-medium ml-1">{lead.primary_contact_email}</span></div>}
            {lead.primary_contact_phone && <div><span className="text-slate-500">Phone:</span> <span className="text-white font-medium ml-1">{lead.primary_contact_phone}</span></div>}
            {lead.industry && <div><span className="text-slate-500">Industry:</span> <span className="text-white font-medium ml-1">{lead.industry}</span></div>}
            {lead.lead_source && <div><span className="text-slate-500">Source:</span> <span className="text-white font-medium ml-1">{lead.lead_source}</span></div>}
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm p-4 mb-6">{error}</div>}

        <form onSubmit={handleConvert} className="space-y-6">
          {/* Account */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-5">Account Details</h2>
            <div className="space-y-4">
              <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Account Name *</label><input type="text" required value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} className="aurora-input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Type</label><select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} className="aurora-select"><option value="prospect">Prospect</option><option value="existing">Existing Customer</option><option value="partner">Partner</option></select></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Industry</label><select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="aurora-select"><option value="">Select an industry</option>{industryOptions.map((industry) => <option key={industry} value={industry}>{industry}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Website</label><input type="text" inputMode="url" placeholder="abc123.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="aurora-input" /></div>
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone</label><input type="tel" placeholder="(734) 693-4081" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhoneNumber(e.target.value) })} className="aurora-input" /></div>
              </div>
            </div>
          </div>

          {/* Opportunity toggle */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Create Opportunity</h2>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.create_opportunity} onChange={(e) => setForm({ ...form, create_opportunity: e.target.checked })} className="accent-[#00d4aa] w-4 h-4" /><span className="text-xs text-slate-400">Create</span></label>
            </div>
            {form.create_opportunity && (
              <div className="space-y-4">
                <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Opportunity Name *</label><input type="text" required value={form.opportunity_name} onChange={(e) => setForm({ ...form, opportunity_name: e.target.value })} className="aurora-input" /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Est. Value ($)</label><input type="number" step="0.01" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} className="aurora-input" /></div>
                  <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Probability %</label><input type="number" min="0" max="100" value={form.probability_percent} onChange={(e) => setForm({ ...form, probability_percent: parseInt(e.target.value) || 0 })} className="aurora-input" /></div>
                  <div><label className="block text-xs font-semibold text-slate-400 mb-1.5">Expected Close</label><input type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} className="aurora-input" /></div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={converting} className="aurora-btn px-8 py-3 text-sm font-semibold">{converting ? 'Converting...' : 'Convert Lead \u2192'}</button>
            <Link href="/admin/crm/leads" className="aurora-btn-secondary px-6 py-3 text-sm inline-flex items-center">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
