import type { SessionData } from '@/lib/session';

export function TopBar({ session }: { session: SessionData }) {
  const isUser = session.role === 'user';
  const hasLimit = session.callLimit !== -1;
  const pct = hasLimit ? Math.min(100, Math.round((session.callsUsed / session.callLimit) * 100)) : 0;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 justify-end gap-5">
      {/* Call quota (users only) */}
      {isUser && hasLimit && (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500 leading-none">Calls used</p>
            <p className="text-sm font-semibold text-gray-800 leading-none mt-0.5">
              {session.callsUsed} <span className="text-gray-400 font-normal">/ {session.callLimit}</span>
            </p>
          </div>
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* User name */}
      <div className="text-sm text-gray-600 font-medium">{session.name}</div>
    </header>
  );
}
