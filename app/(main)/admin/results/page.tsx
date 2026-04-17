'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { CallCard } from '@/components/results/CallCard';
import type { CallRecord } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminResultsPage() {
  const [selectedUserId, setSelectedUserId] = useState('');

  const usersQuery = useSWR<{ id: string; name: string }[]>('/api/admin/users', fetcher);

  const callsUrl = selectedUserId
    ? `/api/calls?user_id=${selectedUserId}`
    : '/api/calls';

  const { data: calls, isLoading } = useSWR<CallRecord[]>(callsUrl, fetcher, {
    refreshInterval: 5000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Results</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {calls?.length ?? 0} call{calls?.length !== 1 ? 's' : ''} · refreshes every 5s
          </p>
        </div>

        {/* User filter dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter by user:</span>
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="rounded-lg border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All users</option>
            {usersQuery.data?.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400 animate-pulse">Loading…</div>
      ) : !calls?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No call records yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map(c => <CallCard key={c.id} call={c} />)}
        </div>
      )}
    </div>
  );
}
