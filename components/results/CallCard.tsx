'use client';
import { useState, useEffect } from 'react';
import type { CallRecord, Intent } from '@/lib/types';
import { IntentBadge } from './IntentBadge';
import { AudioPlayer } from './AudioPlayer';
import { ManualIntentButtons } from './ManualIntentButtons';
import { ConversationView } from './ConversationView';

const INTENT_CARD_STYLES: Record<string, string> = {
  YES:     'border-l-4 border-l-green-500  bg-green-50',
  NO:      'border-l-4 border-l-red-500    bg-red-50',
  UNCLEAR: 'border-l-4 border-l-yellow-400 bg-yellow-50',
};

type Tab = 'conversation' | 'transcript' | 'summary';

export function CallCard({ call: initialCall }: { call: CallRecord }) {
  const [call, setCall]   = useState(initialCall);
  const [tab, setTab]     = useState<Tab>('conversation');

  const isAgent = call.campaign_type?.startsWith('agent-') ?? false;

  // Sync with SWR updates
  useEffect(() => {
    setCall(initialCall);
  }, [
    initialCall.status,
    initialCall.intent,
    initialCall.recording_url,
    initialCall.transcript,
    initialCall.conversation,
    initialCall.call_summary,
    initialCall.success_evaluation,
    initialCall.current_turn_index,
  ]);

  const intentStyle = call.intent ? INTENT_CARD_STYLES[call.intent] ?? '' : '';

  return (
    <div className={`rounded-xl border border-gray-200 p-5 space-y-4 transition-all ${intentStyle || 'bg-white'}`}>
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-semibold text-gray-900">{call.phone}</span>
            {call.contact_name && (
              <span className="text-sm text-gray-600">{call.contact_name}</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              call.status === 'completed' ? 'bg-blue-100 text-blue-700' :
              call.status === 'failed'    ? 'bg-red-100 text-red-600' :
              call.status === 'ringing'   ? 'bg-yellow-100 text-yellow-700' :
              call.status === 'answered'  ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {/* Pipecat in-progress indicator */}
              {call.status === 'answered' && call.agent_engine === 'pipecat' && call.current_turn_index
                ? `Turn ${call.current_turn_index} in progress`
                : call.status}
            </span>
            <p className="text-xs text-gray-400">
              {call.provider === 'exotel' ? 'Model EX' : call.provider === 'vobiz' ? 'Model VO' : call.provider}
              {call.agent_engine ? ` · ${call.agent_engine.toUpperCase()}` : ''}
              {' · '}{new Date(call.called_at).toLocaleString()}
              {call.duration_seconds ? ` · ${call.duration_seconds}s` : ''}
            </p>
          </div>
        </div>
        <div className="ml-4 shrink-0">
          <IntentBadge intent={call.intent} large />
        </div>
      </div>

      {/* Audio player — verification calls only */}
      {!isAgent && <AudioPlayer call={call} />}

      {/* ── Agent call tabs ── */}
      {isAgent && (
        <div>
          {/* Tab bar */}
          <div className="flex border-b border-gray-200 mb-3">
            {(['conversation', 'transcript', 'summary'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                  tab === t
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'conversation' && (
            <ConversationView call={call} />
          )}

          {tab === 'transcript' && (
            <div className="rounded-lg bg-gray-50 p-3 max-h-64 overflow-y-auto">
              {call.full_transcript ? (
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {call.full_transcript}
                </pre>
              ) : call.transcript ? (
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {call.transcript}
                </pre>
              ) : (
                <p className="text-sm text-gray-400 italic">No transcript available.</p>
              )}
            </div>
          )}

          {tab === 'summary' && (
            <div className="space-y-3">
              {call.call_summary ? (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 font-medium mb-1">Summary</p>
                  <p className="text-sm text-gray-700">{call.call_summary}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Summary not yet available.</p>
              )}
              {call.success_evaluation && (
                <div className={`rounded-lg p-3 ${
                  call.success_evaluation.toLowerCase().startsWith('pass')
                    ? 'bg-green-50'
                    : call.success_evaluation.toLowerCase().startsWith('fail')
                    ? 'bg-red-50'
                    : 'bg-gray-50'
                }`}>
                  <p className="text-xs text-gray-500 font-medium mb-1">Success Evaluation</p>
                  <p className="text-sm text-gray-700">{call.success_evaluation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Verification: inline transcript ── */}
      {!isAgent && call.transcript && (
        <div className={`rounded-lg p-3 ${
          call.intent === 'YES' ? 'bg-green-100/60' :
          call.intent === 'NO' ? 'bg-red-100/60' :
          call.intent === 'UNCLEAR' ? 'bg-yellow-100/60' : 'bg-gray-50'
        }`}>
          <p className="text-xs text-gray-500 font-medium mb-1">Transcript</p>
          <p className="text-sm text-gray-700">{call.transcript}</p>
        </div>
      )}

      {/* Manual intent override — verification calls or agent calls without auto-intent */}
      <ManualIntentButtons
        callId={call.id}
        currentIntent={call.intent}
        onUpdate={(intent: Intent) => setCall(prev => ({ ...prev, intent }))}
      />
    </div>
  );
}
