'use client';
import { useState, useEffect } from 'react';
import type { CallRecord, Intent } from '@/lib/types';
import { IntentBadge } from './IntentBadge';
import { AudioPlayer } from './AudioPlayer';
import { ManualIntentButtons } from './ManualIntentButtons';

export function CallCard({ call: initialCall }: { call: CallRecord }) {
  const [call, setCall] = useState(initialCall);

  // Sync with SWR updates (status, intent, recording_url, transcript all update live)
  useEffect(() => {
    setCall(initialCall);
  }, [
    initialCall.status,
    initialCall.intent,
    initialCall.recording_url,
    initialCall.transcript,
  ]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-semibold text-gray-900">{call.phone}</span>
            <IntentBadge intent={call.intent} />
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              call.status === 'completed' ? 'bg-blue-100 text-blue-700' :
              call.status === 'failed'    ? 'bg-red-100 text-red-600' :
              call.status === 'ringing'   ? 'bg-yellow-100 text-yellow-700' :
              call.status === 'answered'  ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {call.status}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            {call.provider === 'exotel' ? 'Model EX' : call.provider === 'vobiz' ? 'Model VO' : call.provider} · {new Date(call.called_at).toLocaleString()}
            {call.duration_seconds ? ` · ${call.duration_seconds}s` : ''}
          </p>
        </div>
      </div>
      <AudioPlayer call={call} />
      {call.transcript && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 font-medium mb-1">Transcript</p>
          <p className="text-sm text-gray-700">{call.transcript}</p>
        </div>
      )}
      <ManualIntentButtons
        callId={call.id}
        currentIntent={call.intent}
        onUpdate={(intent: Intent) => setCall(prev => ({ ...prev, intent }))}
      />
    </div>
  );
}
