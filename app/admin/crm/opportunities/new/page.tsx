'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Account { id: string; name: string; }
interface Contact { id: string; first_name: string; last_name: string; email?: string; title?: string; }
interface User { id: string; full_name: string | null; email: string | null; }

function NewOpportunityForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [newContact, setNewContact] = useState({ first_name: '', last_name: '', email: '', title: '' });

  const [formData, setFormData] = useState({
    name: '', account_id: searchParams.get('account_id') || '', status: 'prospecting',
    estimated_value: 0, probability_percent: 50, expected_close_date: '', description: '',
    contact_id: '', account_owner_id: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, userRes] = await Promise.all([
          fetch('/api/admin/crm/accounts'),
          fetch('/api/admin/users'),
        ]);
        if (accRes.ok) { const data = await accRes.json(); setAccounts(data.accounts || []); }
        if (userRes.ok) { const data = await userRes.json(); setUsers(data.users || []); }
      } catch (error) { console.error('Error fetching data:', error); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!formData.account_id) { setContacts([]); return; }
      try {
        const res = await fetch(`/api/admin/crm/accounts/${formData.account_id}/contacts`);
        if (res.ok) { const data = await res.json(); setContacts(Array.isArray(data) ? data : data.contacts || []); }
      } catch (error) { console.error('Error fetching contacts:', error); }
    };
    fetchContacts();
  }, [formData.account_id]);

  const handleCreateContact = async () => {
    if (!formData.account_id || !newContact.first_name || !newContact.last_name) return;
    try {
      const res = await fetch(`/api/admin/crm/accounts/${formData.account_id}/contacts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newContact),
      });
      if (res.ok) {
        const nc = await res.json();
        setContacts([...contacts, nc]);
        setFormData({ ...formData, contact_id: nc.id });
        setNewContact({ first_name: '', last_name: '', email: '', title: '' });
        setShowContactForm(false);
      }
    } catch (error) { console.error('Error creating contact:', error); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/crm/opportunities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          estimated_value: parseFloat(formData.estimated_value.toString()),
          contact_id: formData.contact_id || null,
          account_owner_id: formData.account_owner_id || null,
        }),
      });
      if (res.ok) { const data = await res.json(); router.push(`/admin/crm/opportunities/${data.opportunity.id}`); }
      else { alert('Failed to create opportunity'); }
    } catch (error) { console.error('Error creating opportunity:', error); alert('Error creating opportunity'); }
    finally { setSubmitting(false); }
  };

  const statuses = ['prospecting', 'discovery', 'proposal', 'negotiation', 'won', 'lost'];
  const getStatusLabel = (s: string) => {
    const l: Record<string, string> = { prospecting: 'Prospecting', discovery: 'Discovery', proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost' };
    return l[s] || s;
  };

  return (
    <div className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-cyan flex items-center justify-center text-[#060918] font-bold text-sm">E</div>
              <h1 className="text-xl font-bold text-white tracking-tight">New Opportunity</h1>
            </div>
            <Link href="/admin/crm/opportunities" className="aurora-btn-secondary px-4 py-2 text-xs">\u2190 Back</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-8 py-8">
        <div className="glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Account *</label>
              <select required value={formData.account_id} disabled={loading} onChange={(e) => setFormData({ ...formData, account_id: e.target.value, contact_id: '' })} className="aurora-select">
                <option value="">Select an account...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Opportunity Name *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Enterprise Software License" className="aurora-input" />
            </div>

            {/* Contact picker */}
            {formData.account_id && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Contact</label>
                <div className="flex gap-2">
                  <select value={formData.contact_id} onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })} className="aurora-select flex-1">
                    <option value="">Select a contact...</option>
                    {contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.title ? ` (${c.title})` : ''}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowContactForm(!showContactForm)} className="aurora-btn-secondary px-3 py-2 text-xs whitespace-nowrap">+ New</button>
                </div>
                {showContactForm && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="First Name *" value={newContact.first_name} onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })} className="aurora-input" />
                      <input type="text" placeholder="Last Name *" value={newContact.last_name} onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })} className="aurora-input" />
                      <input type="email" placeholder="Email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} className="aurora-input" />
                      <input type="text" placeholder="Title" value={newContact.title} onChange={(e) => setNewContact({ ...newContact, title: e.target.value })} className="aurora-input" />
                    </div>
                    <button type="button" onClick={handleCreateContact} disabled={!newContact.first_name || !newContact.last_name} className="aurora-btn px-4 py-2 text-xs">Create &amp; Select</button>
                  </div>
                )}
              </div>
            )}

            {/* Account Owner */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Account Owner</label>
              <select value={formData.account_owner_id} onChange={(e) => setFormData({ ...formData, account_owner_id: e.target.value })} className="aurora-select">
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="aurora-select">
                  {statuses.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Estimated Value</label>
                <input type="number" value={formData.estimated_value} onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })} className="aurora-input" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Probability (%)</label>
                <input type="number" min="0" max="100" value={formData.probability_percent} onChange={(e) => setFormData({ ...formData, probability_percent: parseInt(e.target.value) })} className="aurora-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Expected Close Date</label>
                <input type="date" value={formData.expected_close_date} onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })} className="aurora-input" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="aurora-input min-h-[80px]" rows={3} />
            </div>
            <button type="submit" disabled={submitting} className="aurora-btn w-full py-3">
              {submitting ? 'Creating...' : 'Create Opportunity'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function NewOpportunityPage() {
  return <Suspense><NewOpportunityForm /></Suspense>;
}
