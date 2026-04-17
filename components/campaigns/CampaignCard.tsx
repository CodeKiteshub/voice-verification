import Link from 'next/link';
import type { Campaign } from '@/lib/types';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  verification: { label: 'Verification', color: 'bg-gray-100 text-gray-600' },
  'agent-vapi': { label: 'AI Agent · VAPI', color: 'bg-violet-100 text-violet-700' },
  'agent-pipecat': { label: 'AI Agent · Pipecat', color: 'bg-emerald-100 text-emerald-700' },
};

const VAPI_STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Provisioning…', color: 'bg-amber-100 text-amber-700' },
  provisioned: { label: 'Ready', color: 'bg-green-100 text-green-700' },
  failed:      { label: 'Provisioning failed', color: 'bg-red-100 text-red-700' },
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const type = campaign.campaign_type ?? 'verification';
  const typeBadge = TYPE_LABELS[type] ?? TYPE_LABELS.verification;
  const vapiStatus = campaign.vapi_status;

  const subtitle =
    type === 'verification'
      ? campaign.question
      : campaign.agent_config
        ? `${campaign.agent_config.company_name} · ${campaign.agent_config.agent_role}`
        : '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between hover:shadow-sm transition-shadow">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge.color}`}>
            {typeBadge.label}
          </span>
          {/* VAPI provisioning status */}
          {type === 'agent-vapi' && vapiStatus && vapiStatus !== 'provisioned' && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${VAPI_STATUS_BADGE[vapiStatus]?.color ?? ''}`}>
              {VAPI_STATUS_BADGE[vapiStatus]?.label ?? vapiStatus}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-sm text-gray-500 line-clamp-2">{subtitle}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-400 pt-1">
          <span>
            {campaign.provider === 'exotel' ? 'Model EX'
              : campaign.provider === 'vobiz' ? 'Model VO'
              : campaign.provider}
          </span>
          <span>·</span>
          <span>{campaign.call_count ?? 0} calls</span>
          <span>·</span>
          <span className="capitalize">{campaign.status}</span>
        </div>
      </div>

      <Link
        href={`/campaigns/${campaign.id}`}
        className="ml-4 shrink-0 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
      >
        View
      </Link>
    </div>
  );
}
