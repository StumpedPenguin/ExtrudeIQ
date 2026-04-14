'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Contact { id: string; first_name: string; last_name: string; email?: string; title?: string; is_primary: boolean; is_decision_maker: boolean; }
interface Opportunity { id: string; name: string; status: string; estimated_value?: number; probability_percent: number; expected_close_date?: string; }
interface Quote { id: string; quote_number: string; status: string; created_at: string; opportunity_id?: string; }
interface Activity { id: string; activity_type: string; title: string; description?: string; created_at: string; }
interface Account { id: string; name: string; type: string; website?: string; phone?: string; industry?: string; status: string; }

const statusColor: Record<string, string> = {
  prospecting: 'bg-aurora-blue/20 text-aurora-blue', discovery: 'bg-aurora-cyan/20 text-aurora-cyan',
  proposal: 'bg-amber-500/20 text-amber-400', negotiation: 'bg-orange-500/20 text-orange-400',
  won: 'bg-emerald-500/20 text-emerald-400', lost: 'bg-red-500/20 text-red-400',
};
const quoteStatusColor: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-300', sent: 'bg-aurora-blue/20 text-aurora-blue',
  accepted: 'bg-aurora-teal/20 text-aurora-teal', won: 'bg-emerald-500/20 text-emerald-400', lost: 'bg-red-500/20 text-red-400',
};
const actIcons: Record<string, string> = {
  quote_created: '\ud83d\udcdd', quote_status_changed: '\ud83d\udd04', quote_revision_created: '\ud83d\udccb',
  contact_added: '\ud83d\udc64', contact_removed: '\u274c', opportunity_created: '\ud83c\udfaf',
  opportunity_status_changed: '\ud83d\udcca', lead_converted: '\u2705', account_created: '\ud83c\udfdb\ufe0f',
  account_updated: '\u270f\ufe0f', note: '\ud83d\udccc',
};

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showOppForm, setShowOppForm] = useState(false);
  const [contactData, setContactData] = useState({ first_name: '', last_name: '', email: '', title: '', is_primary: false, is_decision_maker: false });
  const [oppData, setOppData] = useState({ name: '', estimated_value: '', probability_percent: 50, expected_close_date: '', description: '' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/crm/accounts/${accountId}`);
        if (res.ok) { const data = await res.json(); setAccount(data.account); setContacts(data.contacts || []); setOpportunities(data.opportunities || []); setQuotes(data.quotes || []); }
        const actRes = await fetch(`/api/admin/crm/activities?account_id=${accountId}`);
        if (actRes.ok) { const actData = await actRes.json(); setActivities(actData.activities || []); }
      } catch (error) { console.error('Error fetching account:', error); }
      finally { setLoading(false); }
    };
    if (accountId) fetchData();
  }, [accountId]);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/crm/accounts/${accountId}/contacts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contactData) });
      if (res.ok) { const nc = await res.json(); setContacts([...contacts, nc]); setShowContactForm(false); setContactData({ first_name: '', last_name: '', email: '', title: '', is_primary: false, is_decision_maker: false }); }
    } catch (error) { console.error('Error creating contact:', error); }
  };

  const handleDeleteContact = async (cid: string) => {
    if (!confirm('Delete this contact?')) return;
    try { const res = await fetch(`/api/admin/crm/accounts/${accountId}/contacts/${cid}`, { method: 'DELETE' }); if (res.ok) setContacts(contacts.filter((c) => c.id !== cid)); } catch (e) { console.error(e); }
  };

  const handleCreateOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/crm/accounts/${accountId}/opportunities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...oppData, estimated_value: oppData.estimated_value ? Number(oppData.estimated_value) : null }) });
      if (res.ok) { const no = await res.json(); setOpportunities([...opportunities, no]); setShowOppForm(false); setOppData({ name: '', estimated_value: '', probability_percent: 50, expected_close_date: '', description: '' }); }
    } catch (error) { console.error('Error creating opportunity:', error); }
  };

  if (loading) return <div className="aurora-bg min-h-screen flex items-center justify-center"><div className="text-slate-500">Loading account...</div></div>;
  if (!account) return <div className="aurora-bg min-h-screen flex items-center justify-center"><div className="text-slate-500">Account not found</div></div>;

  return (
    <div className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-cyan flex items-center justify-center text-[#060918] font-bold text-sm">E</div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">{account.name}</h1>
                <Link href="/admin/crm/accounts" className="text-xs text-aurora-teal/70 hover:text-aurora-teal">\u2190 Back to Accounts</Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Type</div><div className="font-semibold text-white capitalize">{account.type}</div></div>
          <div className="glass-card p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status</div><div className={`font-semibold ${account.status === 'active' ? 'text-aurora-teal' : 'text-red-400'}`}>{account.status}</div></div>
          {account.industry && <div className="glass-card p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Industry</div><div className="font-semibold text-white">{account.industry}</div></div>}
          {account.phone && <div className="glass-card p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Phone</div><div className="font-semibold text-white">{account.phone}</div></div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Contacts */}
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-white">Contacts</h2>
                <button onClick={() => setShowContactForm(true)} className="aurora-btn px-3 py-1.5 text-xs">+ Add Contact</button>
              </div>
              {showContactForm && (
                <form onSubmit={handleCreateContact} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="First Name *" required value={contactData.first_name} onChange={(e) => setContactData({ ...contactData, first_name: e.target.value })} className="aurora-input" />
                    <input type="text" placeholder="Last Name *" required value={contactData.last_name} onChange={(e) => setContactData({ ...contactData, last_name: e.target.value })} className="aurora-input" />
                    <input type="email" placeholder="Email" value={contactData.email} onChange={(e) => setContactData({ ...contactData, email: e.target.value })} className="aurora-input" />
                    <input type="text" placeholder="Title" value={contactData.title} onChange={(e) => setContactData({ ...contactData, title: e.target.value })} className="aurora-input" />
                    <label className="flex items-center gap-2"><input type="checkbox" checked={contactData.is_primary} onChange={(e) => setContactData({ ...contactData, is_primary: e.target.checked })} className="accent-[#00d4aa]" /><span className="text-xs text-slate-400">Primary</span></label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={contactData.is_decision_maker} onChange={(e) => setContactData({ ...contactData, is_decision_maker: e.target.checked })} className="accent-[#00d4aa]" /><span className="text-xs text-slate-400">Decision Maker</span></label>
                  </div>
                  <div className="flex gap-2"><button type="submit" className="aurora-btn px-4 py-2 text-xs">Save</button><button type="button" onClick={() => setShowContactForm(false)} className="aurora-btn-secondary px-4 py-2 text-xs">Cancel</button></div>
                </form>
              )}
              {contacts.length === 0 ? <div className="text-center py-8 text-slate-500 text-sm">No contacts yet</div> : (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <div key={c.id} className="flex justify-between items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <div>
                        <div className="font-semibold text-white text-sm">{c.first_name} {c.last_name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{c.title && `${c.title} \u00b7 `}{c.email}</div>
                        <div className="flex gap-2 mt-1.5">
                          {c.is_primary && <span className="aurora-badge bg-aurora-blue/20 text-aurora-blue">Primary</span>}
                          {c.is_decision_maker && <span className="aurora-badge bg-aurora-teal/20 text-aurora-teal">Decision Maker</span>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteContact(c.id)} className="text-xs font-semibold text-red-400 hover:text-red-300">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Opportunities */}
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-white">Opportunities</h2>
                <button onClick={() => setShowOppForm(true)} className="aurora-btn px-3 py-1.5 text-xs">+ New Opportunity</button>
              </div>
              {showOppForm && (
                <form onSubmit={handleCreateOpp} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-5 space-y-3">
                  <input type="text" placeholder="Opportunity Name *" required value={oppData.name} onChange={(e) => setOppData({ ...oppData, name: e.target.value })} className="aurora-input" />
                  <div className="grid grid-cols-3 gap-3">
                    <input type="number" step="0.01" placeholder="Est. Value ($)" value={oppData.estimated_value} onChange={(e) => setOppData({ ...oppData, estimated_value: e.target.value })} className="aurora-input" />
                    <input type="number" min="0" max="100" placeholder="Probability %" value={oppData.probability_percent} onChange={(e) => setOppData({ ...oppData, probability_percent: parseInt(e.target.value) })} className="aurora-input" />
                    <input type="date" value={oppData.expected_close_date} onChange={(e) => setOppData({ ...oppData, expected_close_date: e.target.value })} className="aurora-input" />
                  </div>
                  <div className="flex gap-2"><button type="submit" className="aurora-btn px-4 py-2 text-xs">Save</button><button type="button" onClick={() => setShowOppForm(false)} className="aurora-btn-secondary px-4 py-2 text-xs">Cancel</button></div>
                </form>
              )}
              {opportunities.length === 0 ? <div className="text-center py-8 text-slate-500 text-sm">No opportunities yet</div> : (
                <div className="space-y-2">
                  {opportunities.map((opp) => (
                    <Link key={opp.id} href={`/admin/crm/opportunities/${opp.id}`} className="block rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-aurora-teal/15 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-white text-sm">{opp.name}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {opp.estimated_value ? `$${opp.estimated_value.toLocaleString()}` : 'No value'} \u00b7 {opp.probability_percent}% probability
                            {opp.expected_close_date && <> \u00b7 Close: {new Date(opp.expected_close_date).toLocaleDateString()}</>}
                          </div>
                        </div>
                        <span className={`aurora-badge ${statusColor[opp.status] || 'bg-slate-500/20 text-slate-300'}`}>{opp.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quotes */}
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-white">Quotes</h2>
              </div>
              {quotes.length === 0 ? <div className="text-center py-8 text-slate-500 text-sm">No quotes yet</div> : (
                <div className="space-y-2">
                  {quotes.map((q) => (
                    <Link key={q.id} href={`/quotes/${q.id}`} className="block rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-aurora-teal/15 transition-colors">
                      <div className="flex justify-between items-center">
                        <div><div className="font-semibold text-aurora-teal text-sm">{q.quote_number}</div><div className="text-xs text-slate-500 mt-0.5">Created {new Date(q.created_at).toLocaleDateString()}</div></div>
                        <span className={`aurora-badge ${quoteStatusColor[q.status] || 'bg-slate-500/20 text-slate-300'}`}>{q.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-8">
              <h2 className="text-lg font-bold text-white mb-5">Activity</h2>
              {activities.length === 0 ? <div className="text-center py-8 text-slate-500 text-sm">No activity yet</div> : (
                <div className="space-y-4">
                  {activities.map((act) => (
                    <div key={act.id} className="flex gap-3">
                      <div className="text-base flex-shrink-0 mt-0.5">{actIcons[act.activity_type] || '\ud83d\udcc4'}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white">{act.title}</div>
                        {act.description && <div className="text-xs text-slate-500 mt-0.5">{act.description}</div>}
                        <div className="text-[10px] text-slate-600 mt-1">{new Date(act.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
