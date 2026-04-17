'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Phone, BarChart3, Users, ShieldCheck } from 'lucide-react';
import { LogoutButton } from '@/components/auth/LogoutButton';
import type { SessionData } from '@/lib/session';

const USER_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campaigns', label: 'Campaigns',  icon: Phone },
  { href: '/results',   label: 'Results',    icon: BarChart3 },
];

const ADMIN_NAV = [
  { href: '/admin/users',     label: 'Users',         icon: Users },
  { href: '/admin/campaigns', label: 'All Campaigns', icon: Phone },
  { href: '/admin/results',   label: 'All Results',   icon: BarChart3 },
];

export function Sidebar({ session }: { session: SessionData }) {
  const pathname = usePathname();

  const navLink = (href: string, label: string, Icon: React.ElementType) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link key={href} href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </Link>
    );
  };

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-tight">VoiceVerify</h1>
        <p className="text-xs text-gray-400 mt-0.5 capitalize">{session.role} Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {USER_NAV.map(({ href, label, icon }) => navLink(href, label, icon))}

        {session.role === 'admin' && (
          <>
            <div className="pt-4 pb-1 px-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Admin</span>
              </div>
            </div>
            {ADMIN_NAV.map(({ href, label, icon }) => navLink(href, label, icon))}
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-gray-700 space-y-2">
        <div className="px-3">
          <p className="text-sm font-medium text-white truncate">{session.name}</p>
          <p className="text-xs text-gray-400 truncate">{session.email}</p>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
            session.role === 'admin'
              ? 'bg-indigo-900 text-indigo-300'
              : 'bg-gray-700 text-gray-300'
          }`}>
            {session.role}
          </span>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
