import type { Intent } from '@/lib/types';

const CONFIG = {
  YES:     { color: 'bg-green-100 text-green-700',   label: '✓ YES' },
  NO:      { color: 'bg-red-100 text-red-700',       label: '✗ NO' },
  UNCLEAR: { color: 'bg-yellow-100 text-yellow-700', label: '? UNCLEAR' },
  PENDING: { color: 'bg-gray-100 text-gray-500',     label: '⋯ PENDING' },
};

export function IntentBadge({ intent }: { intent?: Intent }) {
  const cfg = CONFIG[(intent ?? 'PENDING') as keyof typeof CONFIG] ?? CONFIG.PENDING;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
