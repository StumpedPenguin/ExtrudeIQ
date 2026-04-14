'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Opportunity { id: string; name: string; status: string; estimated_value?: number; probability_percent: number; expected_close_date?: string; description?: string; account_id?: string; account?: { id: string; name: string }; }
interface Quote { id: string; quote_number: string; status: string; created_at: string; }
interface Activity { id: string; activity_type: string; title: string; description?: string; created_at: string; }

const statusOptions = ['prospecting','discovery','proposal','negotiation','won','lost'];
const statusColor: Record<string, string> = {
  prospecting: 'bg-aurora-blue/20 text-aurora-blue', discovery: 'bg-aurora-cyan/20 text-aurora-cyan',
  proposal: 'bg-amber-500/20 text-amber-400', negotiation: 'bg-orange-500/20 text-orange-400',
  won: 'bg-emerald-500/20 text-emerald-400', lost: 'bg-red-500/20 text-red-400',
};
const quoteStatusColor: Record<string, string> = { draft: 'bg-slate-500/20 text-slate-300', sent: 'bg-aurora-blue/20 text-aurora-blue', accepted: 'bg-aurora-teal/20 text-aurora-teal', won: 'bg-emerald-500/20 text-emerald-400', lost: 'bg-red-500/20 text-red-400' };
const actIcons: Record<string, string> = {
  quote_created: '\ud83d\udcdd', quote_status_changed: '\ud83d\udd04', quote_revision_created: '\ud83d\udccb',
  opportunity_created: '\ud83c\udfaf', opportunity_status_changed: '\ud83d\udcca', note: '\ud83d\udccc',
};

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const oppId = params.id as string;
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({ name: '', status: '', estimated_value: '', probability_percent: 50, expected_close_date: '', description: '' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/crm/opportunities/${oppId}`);
        if (res.ok) {
          const data = await res.json();
          setOpp(data.opportunity);
          setQuotes(data.quotes || []);
          setEditData({
            name: data.opportunity.name || '',
            status: data.opportunity.status || 'prospecting',
            estimated_value: data.opportunity.estimated_value?.toString() || '',
            probability_percent: data.opportunity.probability_percent ?? 50,
            expected_close_date: data.opportunity.expected_close_date?.slice(0, 10) || '',
            description: data.opportunity.description || ''
          });
        }
        const actRes = await fetch(`/api/admin/crm/activities?opportunity_id=${oppId}`);
        if (actRes.ok) { const actData = await actRes.json(); setActivities(actData.activities || []); }
      } catch (error) { console.error('Error fetching opportunity:', error); }
      finally { setLoading(false); }
    };
    if (oppId) fetchData();
  }, [oppId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/crm/opportunities/${oppId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editData, estimated_value: editData.estimated_value ? Number(editData.estimated_value) : null })
      });
      if (res.ok) { const updated = await res.json(); setOpp(updated); setShowEdit(false); }
    } catch (error) { console.error('Error updating opportunity:', error); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this opportunity? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/crm/opportunities/${oppId}`, { method: 'DELETE' });
      if (res.ok) router.push('/admin/crm/opportunities');
    } catch (error) { console.error('Error deleting opportunity:', error); }
  };

  if (loading) return <div className="aurora-bg min-h-screen flex items-center justify-center"><div className="text-slate-500">Loading opportunity...</div></div>;
  if (!opp) return <div className="aurora-bg min-h-screen flex items-center justify-center"><div className="text-slate-500">Opportunity not found</div></div>;

  const wv = (opp.estimated_value ?? 0) * (opp.probability_percent / 100);

  return (
    <div className="aurora-bg min-h-screen">
      <header className="border-b border-white/[0.06] bg-[#060918]/60 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-aurora-violet to-aurora-blue flex items-center justify-center text-white font-bold text-sm">E</div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">{opp.name}</h1>
                <Link href="/admin/crm/opportunities" className="text-xs text-aurora-teal/70 hover:text-aurora-teal">\u2190 Back to Opportunities</Link>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowEdit(true)} className="aurora-btn-secondary px-4 py-2 text-xs">Edit</button>
              <button onClick={handleDelete} className="aurora-btn-danger px-4 py-2 text-xs">Delete</button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-8 py-8">
        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card glow-teal p-5"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Est. Value</div><div className="text-xl font-bold text-aurora-teal">{opp.estimated_value ? `$${opp.estimated_value.toLocaleString()}` : '\u2014'}</div></div>
          <div className="glass-card glow-violet p-5"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Probability</div><div className="text-xl font-bold text-aurora-violet">{opp.probability_percent}%</div></div>
          <div className="glass-card glow-blue p-5"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Weighted Value</div><div className="text-xl font-bold text-aurora-blue">${wv.toLocaleString(undefined, {maximumFractionDigits: 0})}</div></div>
          <div className="glass-card p-5"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Status</div><div><span className={`aurora-badge text-sm ${statusColor[opp.status] || 'bg-slate-500/20 text-slate-300'}`}>{opp.status}</span></div></div>
        </div>

        {opp.expected_close_date && <div className="glass-card p-4 mb-6"><span className="text-xs text-slate-500">Expected Close:</span> <span className="text-sm font-medium text-white ml-1">{new Date(opp.expected_close_date).toLocaleDateString()}</span></div>}
        {opp.account && <div className="glass-card p-4 mb-6"><span className="text-xs text-slate-500">Account:</span> <Link href={`/admin/crm/accounts/${opp.account.id}`} className="text-sm font-medium text-aurora-teal ml-1 hover:underline">{opp.account.name}</Link></div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {opp.description && <div className="glass-card p-6"><h2 className="text-sm font-bold text-white mb-2">Description</h2><p className="text-sm text-slate-400 leading-relaxed">{opp.description}</p></div>}

            {/* Linked Quotes */}
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-white">Quotes</h2>
                <Link href="/quotes/new" className="aurora-btn px-3 py-1.5 text-xs">+ New Quote</Link>
              </div>
              {quotes.length === 0 ? <div className="text-center py-8 text-slate-500 text-sm">No linked quotes</div> : (
                <div className="space-y-2">{quotes.map((q) => (
                  <Link key={q.id} href={`/quotes/${q.id}`} className="block rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-aurora-teal/15 transition-colors">
                    <div className="flex justify-between items-center">
                      <div><div className="font-semibold text-aurora-teal text-sm">{q.quote_number}</div><div className="text-xs text-slate-500 mt-0.5">Created {new Date(q.created_at).toLocaleDateString()}</div></div>
                      <span className={`aurora-badge ${quoteStatusColor[q.status] || 'bg-slate-500/20 text-slate-300'}`}>{q.status}</span>
                    </div>
                  </Link>
                ))}</div>
              )}
            </div>
          </div>

          {/* Activity sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-8">
              <h2 className="text-lg font-bold text-white mb-5">Activity</h2>
              {activities.length === 0 ? <div className="text-center py-8 text-slate-500 text-sm">No activity yet</div> : (
                <div className="space-y-4">{activities.map((act) => (
                  <div key={act.id} className="flex gap-3">
                    <div className="text-base flex-shrink-0 mt-0.5">{actIcons[act.activity_type] || '\ud83d\udcc4'}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white">{act.title}</div>
                      {act.description && <div className="text-xs text-slate-500 mt-0.5">{act.description}</div>}
                      <div className="text-[10px] text-slate-600 mt-1">{new Date(act.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="aurora-overlay" onClick={() => setShowEdit(false)}>
          <div className="glass-card max-w-lg w-full mx-4 p-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-6">Edit Opportunity</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input type="text" placeholder="Name *" required value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="aurora-input" />
              <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className="aurora-select">{statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" step="0.01" placeholder="Est. Value ($)" value={editData.estimated_value} onChange={(e) => setEditData({ ...editData, estimated_value: e.target.value })} className="aurora-input" />
                <input type="number" min="0" max="100" placeholder="Probability %" value={editData.probability_percent} onChange={(e) => setEditData({ ...editData, probability_percent: parseInt(e.target.value) })} className="aurora-input" />
                <input type="date" value={editData.expected_close_date} onChange={(e) => setEditData({ ...editData, expected_close_date: e.target.value })} className="aurora-input" />
              </div>
              <textarea placeholder="Description" rows={3} value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="aurora-input" />
              <div className="flex gap-3"><button type="submit" className="aurora-btn px-6 py-2.5 text-sm">Save Changes</button><button type="button" onClick={() => setShowEdit(false)} className="aurora-btn-secondary px-6 py-2.5 text-sm">Cancel</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
