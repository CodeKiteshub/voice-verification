'use client';
import { useState } from 'react';
import type { Provider } from '@/lib/types';

export function ProviderToggle({ initial }: { initial: Provider }) {
  const [active, setActive] = useState<Provider>(initial);

  const select = async (p: Provider) => {
    setActive(p);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active_provider: p }),
    });
  };

  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {(['exotel', 'vobiz'] as Provider[]).map(p => (
        <button key={p} onClick={() => select(p)}
          className={`px-4 py-1.5 rounded-md text-sm font-semibold capitalize transition-all ${
            active === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {p}
          {active === p && (
            <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500 align-middle" />
          )}
        </button>
      ))}
    </div>
  );
}
