import Link from 'next/link';
import type { Campaign } from '@/lib/types';

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between hover:shadow-sm transition-shadow">
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-2">{campaign.question}</p>
        <div className="flex items-center gap-3 text-xs text-gray-400 pt-1">
          <span className="capitalize">{campaign.provider}</span>
          <span>·</span>
          <span>{campaign.call_count ?? 0} calls</span>
          <span>·</span>
          <span className="capitalize">{campaign.status}</span>
        </div>
      </div>
      <Link href={`/campaigns/${campaign.id}`}
        className="ml-4 shrink-0 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
      >
        View
      </Link>
    </div>
  );
}
