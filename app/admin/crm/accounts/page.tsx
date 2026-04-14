'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Account {
  id: string;
  name: string;
  type: string;
  status: string;
  industry?: string;
  phone?: string;
  created_at: string;
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'prospect', website: '', phone: '', industry: '', annual_revenue: '' });

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: page.toString(), limit: '25' });
        if (type) params.append('type', type);
        if (search) params.append('search', search);
        const res = await fetch(`/api/admin/crm/accounts?${params}`);
        if (res.ok) { const data = await res.json(); setAccounts(data.accounts); }
      } catch (error) { console.error('Error fetching accounts:', error); }
      finally { setLoading(false); }
    };
    fetchAccounts();
  }, [page, type, search]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/crm/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (res.ok) {
        setShowForm(false);
        setFormData({ name: '', type: 'prospect', website: '', phone: '', industry: '', annual_revenue: '' });
        setPage(1);
        const fetchRes = await fetch('/api/admin/crm/accounts?page=1&limit=25');
        if (fetchRes.ok) { const data = await fetchRes.json(); setAccounts(data.accounts); }
      }
    } catch (error) { console.error('Error creating account:', error); }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      const res = await fetch(`/api/admin/crm/accounts/${accountId}`, { method: 'DELETE' });
      if (res.ok) setAccounts(accounts.filter((a) => a.id !== accountId));
    } catch (error) { console.error('Error deleting account:', error); }
  };

  const typeOptions = [
    { value: '', label: 'All Types' }, { value: 'prospect', label: 'Prospect' },
    { value: 'existing', label: 'Existing Customer' }, { value: 'partner', label: 'Partner' },
  ];

  return (
    <div className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-cyan flex items-center justify-center text-[#060918] font-bold text-sm">E</div>
              <h1 className="text-xl font-bold text-white tracking-tight">Accounts</h1>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(true)} className="aurora-btn px-4 py-2 text-xs">+ New Account</button>
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
              <input type="text" placeholder="Search by company name..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="aurora-input" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Account Type</label>
              <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="aurora-select">
                {typeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* New Account Modal */}
        {showForm && (
          <div className="aurora-overlay">
            <div className="glass-card glow-teal max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-5 text-white">Create New Account</h2>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Account Name *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="aurora-input" /></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Account Type</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="aurora-select"><option value="prospect">Prospect</option><option value="existing">Existing Customer</option><option value="partner">Partner</option></select></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Industry</label><input type="text" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className="aurora-input" /></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Website</label><input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="aurora-input" /></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-1">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="aurora-input" /></div>
                <div className="flex gap-3 pt-3">
                  <button type="submit" className="aurora-btn flex-1 py-2.5 text-sm">Create Account</button>
                  <button type="button" onClick={() => setShowForm(false)} className="aurora-btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Accounts List */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No accounts found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Industry</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account, i) => (
                    <tr key={account.id}
                      className={`border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}
                      onClick={() => router.push(`/admin/crm/accounts/${account.id}`)}
                    >
                      <td className="px-6 py-3.5 text-sm font-medium text-white">{account.name}</td>
                      <td className="px-6 py-3.5 text-sm text-slate-400">{account.industry || '—'}</td>
                      <td className="px-6 py-3.5 text-sm text-slate-300 capitalize">{account.type}</td>
                      <td className="px-6 py-3.5 text-sm">
                        <span className={`font-medium ${account.status === 'active' ? 'text-aurora-teal' : 'text-red-400'}`}>{account.status}</span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-slate-300">{account.phone || '—'}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account.id); }}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-1 rounded border border-red-500/20 hover:bg-red-500/10 transition-colors">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
