'use client';
import { useState } from 'react';

export function STTToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stt_enabled: next }),
    });
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium">Auto Transcribe (STT)</span>
      <button onClick={toggle} role="switch" aria-checked={enabled}
        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
          enabled ? 'bg-indigo-600' : 'bg-gray-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 mt-1 ml-1 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
      <span className={`text-xs font-bold ${enabled ? 'text-indigo-600' : 'text-gray-400'}`}>
        {enabled ? 'ON' : 'OFF'}
      </span>
      {!enabled && (
        <span className="text-xs text-amber-600">⚠ Listen to recordings and set intent manually</span>
      )}
    </div>
  );
}
