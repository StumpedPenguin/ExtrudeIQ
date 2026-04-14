'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navPages = [
  { label: 'Home', href: '/dashboard', icon: '🏠' },
  { label: 'Leads', href: '/admin/crm/leads', icon: '🎯' },
  { label: 'Opportunities', href: '/admin/crm/opportunities', icon: '🎲' },
  { label: 'Accounts', href: '/admin/crm/accounts', icon: '🏛️' },
  { label: 'Pipeline', href: '/admin/crm/pipeline', icon: '📈' },
  { label: 'New Quote', href: '/quotes/new', icon: '📝' },
  { label: 'Quote List', href: '/quotes', icon: '📋' },
  { label: 'Admin Dashboard', href: '/admin/dashboard', icon: '⚙️' },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Fixed left-edge tab — always visible when sidebar is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 h-20 w-8 flex items-center justify-center bg-[#0a0e1a] border border-l-0 border-white/[0.15] rounded-r-xl hover:w-10 hover:bg-[#00d4aa]/20 hover:border-[#00d4aa]/40 transition-all duration-200 group shadow-lg"
          style={{ zIndex: 9999 }}
          aria-label="Open navigation"
        >
          <svg className="w-5 h-5 text-slate-300 group-hover:text-[#00d4aa] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          style={{ zIndex: 9998 }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 left-0 h-full w-64 border-r border-white/[0.08] bg-[#0a0e1a] shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ zIndex: 9999 }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#06b6d4] flex items-center justify-center text-[#060918] font-bold text-sm">
              E
            </div>
            <span className="text-sm font-bold text-white tracking-tight">ExtrudeIQ</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Close navigation"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="px-3 py-4 space-y-1">
          {navPages.map((p) => {
            const isActive = pathname === p.href || (p.href !== '/dashboard' && pathname.startsWith(p.href + '/'));
            return (
              <Link
                key={p.href}
                href={p.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <span className="text-base">{p.icon}</span>
                {p.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
