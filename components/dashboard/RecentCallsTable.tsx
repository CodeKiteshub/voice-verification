import type { CallRecord } from '@/lib/types';
import { IntentBadge } from '@/components/results/IntentBadge';

export function RecentCallsTable({ calls }: { calls: CallRecord[] }) {
  if (!calls.length) return <p className="text-gray-400 text-sm">No calls yet.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Intent</th>
            <th className="px-4 py-3 font-medium">Provider</th>
            <th className="px-4 py-3 font-medium">Called At</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {calls.map(c => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono">{c.phone}</td>
              <td className="px-4 py-3 capitalize">{c.status}</td>
              <td className="px-4 py-3"><IntentBadge intent={c.intent} /></td>
              <td className="px-4 py-3 capitalize">{c.provider}</td>
              <td className="px-4 py-3 text-gray-500">{new Date(c.called_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
