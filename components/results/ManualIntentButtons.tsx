'use client';
import type { Intent } from '@/lib/types';

const STYLES: Record<Intent, string> = {
  YES:     'bg-green-100 border-green-500 text-green-700',
  NO:      'bg-red-100 border-red-500 text-red-700',
  UNCLEAR: 'bg-yellow-100 border-yellow-500 text-yellow-700',
};

export function ManualIntentButtons({
  callId, currentIntent, onUpdate,
}: {
  callId: string;
  currentIntent?: Intent;
  onUpdate: (intent: Intent) => void;
}) {
  const set = async (intent: Intent) => {
    onUpdate(intent); // optimistic update — parent state updates immediately
    await fetch(`/api/calls/${callId}/intent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent }),
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Set intent:</span>
      {(['YES', 'NO', 'UNCLEAR'] as Intent[]).map(intent => (
        <button key={intent} onClick={() => set(intent)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-all ${
            currentIntent === intent
              ? STYLES[intent]
              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'
          }`}
        >
          {intent}
        </button>
      ))}
    </div>
  );
}
