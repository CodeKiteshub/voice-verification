import { getDashboardStats, getCallRecords, getSetting, initSettings } from '@/lib/db';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { RecentCallsTable } from '@/components/dashboard/RecentCallsTable';
import { VoiceSelector } from '@/components/dashboard/VoiceSelector';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await initSettings();
  const [stats, recentCalls, ttsVoice] = await Promise.all([
    getDashboardStats(),
    getCallRecords({ limit: 10 }),
    getSetting('tts_voice'),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      <StatsGrid stats={stats} />
      <VoiceSelector initial={ttsVoice ?? 'anushka'} />
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Calls</h3>
        <RecentCallsTable calls={recentCalls} />
      </div>
    </div>
  );
}
