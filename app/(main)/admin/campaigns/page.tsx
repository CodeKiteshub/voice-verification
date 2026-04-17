import { getCampaigns, getUsers } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { CampaignCard } from '@/components/campaigns/CampaignCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ user_id?: string }>;
}) {
  await requireAdmin();
  const { user_id } = await searchParams;

  const [campaigns, users] = await Promise.all([
    getCampaigns(user_id),
    getUsers(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Campaigns</h2>
          <p className="text-sm text-gray-500 mt-0.5">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        {/* User filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter by user:</span>
          <div className="flex gap-1.5 flex-wrap">
            <Link
              href="/admin/campaigns"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                !user_id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'
              }`}
            >
              All
            </Link>
            {users.map(u => (
              <Link
                key={u.id}
                href={`/admin/campaigns?user_id=${u.id}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  user_id === u.id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'
                }`}
              >
                {u.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No campaigns found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
        </div>
      )}
    </div>
  );
}
