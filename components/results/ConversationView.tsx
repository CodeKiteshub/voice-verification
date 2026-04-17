'use client';
import type { CallRecord, ConversationTurn } from '@/lib/types';
import { parseVapiTranscript } from '@/lib/services/transcript';

interface ConversationViewProps {
  call: CallRecord;
}

/**
 * Renders a turn-by-turn conversation view for agent calls.
 * Handles all three transcript formats:
 * - 'pipecat' — uses call.conversation[] directly
 * - 'vapi'    — parses call.transcript string into turns
 * - 'raw'     — shows as plain text (verification calls)
 */
export function ConversationView({ call }: ConversationViewProps) {
  const turns = getConversationTurns(call);

  if (!turns.length) {
    return (
      <div className="text-sm text-gray-400 italic py-4 text-center">
        No conversation recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 py-1">
      {turns.map((turn, idx) => (
        <div
          key={idx}
          className={`flex gap-3 ${turn.role === 'agent' ? '' : 'flex-row-reverse'}`}
        >
          {/* Avatar */}
          <div
            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              turn.role === 'agent'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {turn.role === 'agent' ? 'AI' : 'C'}
          </div>

          {/* Bubble */}
          <div
            className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${
              turn.role === 'agent'
                ? 'bg-indigo-50 text-gray-800 rounded-tl-none'
                : 'bg-gray-100 text-gray-700 rounded-tr-none'
            }`}
          >
            <p className="leading-relaxed">{turn.content}</p>
            {turn.timestamp && (
              <p className="text-xs text-gray-400 mt-1">
                {formatTimestamp(turn.timestamp)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function getConversationTurns(call: CallRecord): ConversationTurn[] {
  // Pipecat: conversation array is stored directly
  if (call.transcript_format === 'pipecat' && call.conversation?.length) {
    return call.conversation;
  }

  // VAPI: parse the transcript string
  if (call.transcript_format === 'vapi' && call.transcript) {
    return parseVapiTranscript(call.transcript);
  }

  // conversation[] exists regardless of format
  if (call.conversation?.length) {
    return call.conversation;
  }

  return [];
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}
