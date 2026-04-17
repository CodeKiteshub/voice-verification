import type { ConversationTurn } from '@/lib/types';

/**
 * Build a human-readable transcript from Pipecat ConversationTurn[].
 * Format: "Agent: ...\nCaller: ..."
 */
export function buildPipecatTranscript(turns: ConversationTurn[]): string {
  return turns
    .map(t => `${t.role === 'agent' ? 'Agent' : 'Caller'}: ${t.content}`)
    .join('\n');
}

/**
 * Extract user-only text from a ConversationTurn[] array.
 * Used for intent extraction — we only run extractIntent() on user turns,
 * never on agent turns (which contain YES/UNCLEAR/etc. as prompts).
 */
export function extractUserTranscript(turns: ConversationTurn[]): string {
  return turns
    .filter(t => t.role === 'user')
    .map(t => t.content)
    .join(' ');
}

/**
 * Normalize a VAPI-formatted transcript (format: "AI: ...\nUser: ...")
 * into our standard "Agent: ...\nCaller: ..." format for display consistency.
 */
export function normalizeVapiTranscript(vapiTranscript: string): string {
  return vapiTranscript
    .replace(/^AI:/gm, 'Agent:')
    .replace(/^User:/gm, 'Caller:');
}

/**
 * Parse a VAPI transcript string into ConversationTurn[].
 * VAPI format: "AI: ...\nUser: ..."
 */
export function parseVapiTranscript(vapiTranscript: string): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  const lines = vapiTranscript.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('AI:')) {
      turns.push({ role: 'agent', content: trimmed.slice(3).trim() });
    } else if (trimmed.startsWith('User:')) {
      turns.push({ role: 'user', content: trimmed.slice(5).trim() });
    }
  }
  return turns;
}

/**
 * Extract user-only text from a VAPI-formatted transcript string.
 * Used for intent extraction on VAPI agent calls.
 */
export function extractUserTranscriptFromVapi(vapiTranscript: string): string {
  return parseVapiTranscript(vapiTranscript)
    .filter(t => t.role === 'user')
    .map(t => t.content)
    .join(' ');
}
