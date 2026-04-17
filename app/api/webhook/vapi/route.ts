/**
 * POST /api/webhook/vapi
 *
 * Receives VAPI end-of-call-report webhook.
 * VAPI sends this after a call ends with full transcript, summary, and analysis.
 *
 * Authentication: x-vapi-secret header must match vapi_webhook_secret setting.
 *
 * VAPI payload structure:
 * {
 *   message: {
 *     type: "end-of-call-report",
 *     call: { id, metadata: { call_record_id } },
 *     artifact: {
 *       transcript: string,          // "AI: ...\nUser: ..." format
 *       messages: [...],             // Structured messages
 *     },
 *     analysis: {
 *       summary: string,
 *       successEvaluation: string,
 *     },
 *     durationSeconds: number,
 *   }
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, updateCallRecord } from '@/lib/db';
import { extractIntent } from '@/lib/services/intent';
import {
  buildPipecatTranscript,
  extractUserTranscriptFromVapi,
  parseVapiTranscript,
} from '@/lib/services/transcript';

export async function POST(req: NextRequest) {
  // ── Auth: verify x-vapi-secret header ─────────────────────────────────────
  const settings = await getAllSettings();
  const webhookSecret = settings.vapi_webhook_secret;
  if (webhookSecret) {
    const incoming = req.headers.get('x-vapi-secret');
    if (incoming !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const msg = body?.message;
  if (!msg || msg.type !== 'end-of-call-report') {
    // VAPI sends other event types (status-update, etc.) — ignore them
    return NextResponse.json({ ok: true });
  }

  // ── Extract call_record_id from metadata ──────────────────────────────────
  const callRecordId: string = msg.call?.metadata?.call_record_id ?? '';
  if (!callRecordId) {
    console.error('[vapi webhook] Missing call_record_id in metadata', msg.call?.id);
    return NextResponse.json({ error: 'Missing call_record_id' }, { status: 400 });
  }

  // ── Extract data from VAPI payload ────────────────────────────────────────
  const vapiTranscript: string = msg.artifact?.transcript ?? '';
  const summary: string = msg.analysis?.summary ?? '';
  const successEvaluation: string = msg.analysis?.successEvaluation ?? '';
  const durationSeconds: number = Math.round(msg.durationSeconds ?? 0);

  // ── Build conversation turns from VAPI transcript ─────────────────────────
  const conversation = parseVapiTranscript(vapiTranscript);
  const fullTranscript = buildPipecatTranscript(conversation);

  // ── Intent: extract from user-only turns ─────────────────────────────────
  // Fix 9: never run extractIntent on agent turns — they contain YES/UNCLEAR keywords
  const userOnlyText = extractUserTranscriptFromVapi(vapiTranscript);
  const intent = extractIntent(userOnlyText);

  // ── Save to MongoDB ───────────────────────────────────────────────────────
  await updateCallRecord(callRecordId, {
    status: 'completed',
    transcript: vapiTranscript,
    transcript_format: 'vapi',
    conversation,
    full_transcript: fullTranscript,
    user_transcript: userOnlyText,
    intent,
    call_summary: summary || undefined,
    success_evaluation: successEvaluation || undefined,
    duration_seconds: durationSeconds || undefined,
    completed_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
