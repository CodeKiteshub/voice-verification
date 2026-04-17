/**
 * POST /api/webhook/pipecat
 *
 * Receives the call-ended report from the Pipecat Python service.
 * Called after the call ends (hang up, silence timeout, all questions answered).
 *
 * Authentication: Authorization: Bearer {PIPECAT_WEBHOOK_SECRET}
 *
 * Payload:
 * {
 *   call_record_id: string,
 *   conversation: ConversationTurn[],   // Full turn-by-turn conversation
 *   duration_seconds?: number,
 * }
 *
 * Flow:
 * 1. Verify auth
 * 2. Drain any turns from Redis (crash recovery — Pipecat pushes to Redis per turn)
 * 3. Merge Redis turns into payload conversation (Redis wins on conflict — it has realtime data)
 * 4. Build full_transcript, extract user_transcript, run intent
 * 5. Save to MongoDB
 * 6. Trigger async success_evaluation (GPT post-processing)
 * 7. Delete Redis key
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyPipecatWebhook } from '@/lib/auth';
import { updateCallRecord, getCallById } from '@/lib/db';
import { extractIntent } from '@/lib/services/intent';
import { buildPipecatTranscript, extractUserTranscript } from '@/lib/services/transcript';
import { generateSuccessEvaluation } from '@/lib/services/agent-eval';
import type { ConversationTurn } from '@/lib/types';

export async function POST(req: NextRequest) {
  if (!verifyPipecatWebhook(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const callRecordId: string = body.call_record_id ?? '';
  if (!callRecordId) {
    return NextResponse.json({ error: 'Missing call_record_id' }, { status: 400 });
  }

  let conversation: ConversationTurn[] = body.conversation ?? [];
  const durationSeconds: number = body.duration_seconds ?? 0;

  // ── Drain Redis for crash recovery ─────────────────────────────────────────
  // If the Pipecat server crashed mid-call, partial turns may be in Redis.
  // Merge them with whatever the webhook payload has.
  if (process.env.REDIS_URL) {
    try {
      const redisTurns = await drainRedis(callRecordId);
      if (redisTurns.length > conversation.length) {
        // Redis has more turns — use Redis data (it was updated per-turn)
        conversation = redisTurns;
      }
    } catch (err) {
      console.error('[pipecat webhook] Redis drain failed (non-fatal):', err);
    }
  }

  // ── Build transcript + intent ──────────────────────────────────────────────
  const fullTranscript = buildPipecatTranscript(conversation);
  const userOnlyText = extractUserTranscript(conversation);
  const intent = extractIntent(userOnlyText);

  // ── Save to MongoDB ────────────────────────────────────────────────────────
  await updateCallRecord(callRecordId, {
    status: 'completed',
    transcript_format: 'pipecat',
    conversation,
    full_transcript: fullTranscript,
    user_transcript: userOnlyText,
    intent,
    duration_seconds: durationSeconds || undefined,
    completed_at: new Date().toISOString(),
  });

  // ── Async: generate success evaluation via GPT ────────────────────────────
  // Non-blocking — UI will show it when ready
  const call = await getCallById(callRecordId);
  if (call?.campaign_id) {
    generateSuccessEvaluation(callRecordId, conversation, call.campaign_id).catch(console.error);
  }

  // ── Clear Redis key ────────────────────────────────────────────────────────
  if (process.env.REDIS_URL) {
    clearRedisKey(callRecordId).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}

// ─── Redis helpers ────────────────────────────────────────────────────────────

async function drainRedis(callRecordId: string): Promise<ConversationTurn[]> {
  const { default: Redis } = await import('ioredis');
  const redis = new Redis(process.env.REDIS_URL!);
  try {
    const key = `pipecat:turns:${callRecordId}`;
    const items = await redis.lrange(key, 0, -1);
    return items.map(item => JSON.parse(item) as ConversationTurn);
  } finally {
    await redis.quit();
  }
}

async function clearRedisKey(callRecordId: string): Promise<void> {
  const { default: Redis } = await import('ioredis');
  const redis = new Redis(process.env.REDIS_URL!);
  try {
    await redis.del(`pipecat:turns:${callRecordId}`);
  } finally {
    await redis.quit();
  }
}
