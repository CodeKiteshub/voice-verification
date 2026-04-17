import { getDashboardStats, getCallRecords } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { RecentCallsTable } from '@/components/dashboard/RecentCallsTable';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await requireSession();

  // Admin sees global stats; users see only their own
  const userId = session.role === 'admin' ? undefined : session.userId;

  const [stats, recentCalls] = await Promise.all([
    getDashboardStats(userId),
    getCallRecords({ user_id: userId, limit: 10 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        {session.role === 'admin' && (
          <span className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full font-medium">
            Showing all users
          </span>
        )}
      </div>
      <StatsGrid stats={stats} />
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Calls</h3>
        <RecentCallsTable calls={recentCalls} />
      </div>
    </div>
  );
}
