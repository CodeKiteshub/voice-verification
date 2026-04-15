import Link from 'next/link';
import { getCampaigns } from '@/lib/db';
import { CampaignCard } from '@/components/campaigns/CampaignCard';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Campaigns</h2>
        <Link href="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>
      {campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No campaigns yet</p>
          <p className="text-sm mt-1">Create one to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
        </div>
      )}
    </div>
  );
}
