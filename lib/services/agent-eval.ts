/**
 * Agent call success evaluation — async GPT post-processing.
 *
 * VAPI provides analysis.successEvaluation natively.
 * Pipecat does not — we generate it here after the call ends.
 *
 * Called fire-and-forget from app/api/webhook/pipecat/route.ts.
 * Result is stored in call_record.success_evaluation.
 * UI shows it in the "Summary" tab of CallCard.
 */
import { updateCallRecord, getCampaignById } from '@/lib/db';
import type { ConversationTurn } from '@/lib/types';
import { buildPipecatTranscript } from './transcript';

/**
 * Generate a success evaluation for a completed agent call.
 * Uses GPT-4o-mini to assess if all questions were answered.
 *
 * @param callRecordId - MongoDB call record ID to update
 * @param conversation - Full conversation turns
 * @param campaignId - Used to fetch the original question list
 */
export async function generateSuccessEvaluation(
  callRecordId: string,
  conversation: ConversationTurn[],
  campaignId: string
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[agent-eval] OPENAI_API_KEY not set — skipping success evaluation');
    return;
  }

  const campaign = await getCampaignById(campaignId);
  if (!campaign?.agent_config?.questions?.length) return;

  const questions = campaign.agent_config.questions
    .sort((a, b) => a.order - b.order)
    .map((q, i) => `${i + 1}. ${q.text}`)
    .join('\n');

  const transcript = buildPipecatTranscript(conversation);
  if (!transcript.trim()) return;

  const prompt = `You are evaluating a phone call by an AI sales/support agent.

The agent was supposed to ask the following questions:
${questions}

Here is the conversation transcript:
${transcript}

Based on the transcript:
1. Did the agent ask all the questions?
2. Did the caller provide meaningful responses?

Answer in 2-3 sentences. Start with "Pass" or "Fail" based on whether all questions were covered.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You evaluate phone call success. Be concise and objective.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      console.error('[agent-eval] OpenAI API error:', res.status, await res.text());
      return;
    }

    const data = await res.json();
    const evaluation = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (evaluation) {
      await updateCallRecord(callRecordId, { success_evaluation: evaluation });
    }
  } catch (err) {
    console.error('[agent-eval] Failed to generate evaluation:', err);
    // Non-fatal — the call record is already saved, evaluation is just a bonus
  }
}
