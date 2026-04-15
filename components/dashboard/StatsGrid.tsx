import type { DashboardStats } from '@/lib/types';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export function StatsGrid({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard label="Total Calls"  value={stats.total}     color="text-gray-900" />
      <StatCard label="Answered"     value={stats.answered}  color="text-blue-600" />
      <StatCard label="Completed"    value={stats.completed} color="text-indigo-600" />
      <StatCard label="YES"          value={stats.yes}       color="text-green-600" />
      <StatCard label="NO"           value={stats.no}        color="text-red-600" />
      <StatCard label="Failed"       value={stats.failed}    color="text-orange-600" />
    </div>
  );
}
