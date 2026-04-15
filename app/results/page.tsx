'use client';
import useSWR from 'swr';
import type { CallRecord } from '@/lib/types';
import { CallCard } from '@/components/results/CallCard';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ResultsPage() {
  const { data: calls, isLoading } = useSWR<CallRecord[]>(
    '/api/calls',
    fetcher,
    { refreshInterval: 5000 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Results</h2>
        {calls && (
          <p className="text-sm text-gray-500">{calls.length} total calls · auto-refreshes every 5s</p>
        )}
      </div>
      {isLoading && <div className="text-gray-400 animate-pulse text-sm">Loading calls…</div>}
      {calls?.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No calls yet</p>
          <p className="text-sm mt-1">Trigger a campaign to see results here</p>
        </div>
      )}
      <div className="space-y-4">
        {calls?.map(call => <CallCard key={call.id} call={call} />)}
      </div>
    </div>
  );
}
