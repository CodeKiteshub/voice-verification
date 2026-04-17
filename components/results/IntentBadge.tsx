import type { Intent } from '@/lib/types';

const CONFIG = {
  YES:     { color: 'bg-green-200 text-green-800 border border-green-400',   label: '✓ YES',     icon: '✓' },
  NO:      { color: 'bg-red-200 text-red-800 border border-red-400',         label: '✗ NO',      icon: '✗' },
  UNCLEAR: { color: 'bg-yellow-200 text-yellow-800 border border-yellow-400',label: '? UNCLEAR', icon: '?' },
  PENDING: { color: 'bg-gray-100 text-gray-400 border border-gray-200',      label: '⋯ PENDING', icon: '⋯' },
};

export function IntentBadge({ intent, large }: { intent?: Intent; large?: boolean }) {
  const cfg = CONFIG[(intent ?? 'PENDING') as keyof typeof CONFIG] ?? CONFIG.PENDING;

  if (large) {
    return (
      <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-bold tracking-wide shadow-sm ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
