import { NextRequest, NextResponse } from 'next/server';
import { verifyExotelWebhook } from '@/lib/auth';
import { getCallById, updateCallRecord } from '@/lib/db';

const STATUS_MAP: Record<string, string> = {
  completed: 'completed', failed: 'failed', 'no-answer': 'no-answer',
  busy: 'busy', ringing: 'ringing', 'in-progress': 'answered',
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyExotelWebhook(req, rawBody)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const callRecordId = new URL(req.url).searchParams.get('call_record_id') ?? '';

  // Parse URL-encoded body manually (body already consumed as text)
  const body = new URLSearchParams(rawBody);
  const callStatus = body.get('CallStatus') ?? '';
  const callSid = body.get('CallSid') ?? '';
  const duration = parseInt(body.get('CallDuration') ?? '0');

  // Fix 2: Skip writing completed status for Pipecat agent calls —
  // Pipecat owns the terminal status for those calls. Only update
  // non-terminal fields (duration, provider_call_id) to avoid race condition.
  const call = await getCallById(callRecordId);
  if (call?.campaign_type === 'agent-pipecat') {
    await updateCallRecord(callRecordId, {
      ...(callSid ? { provider_call_id: callSid } : {}),
      ...(duration ? { duration_seconds: duration } : {}),
    });
    return new NextResponse('OK');
  }

  const mapped = STATUS_MAP[callStatus] ?? callStatus;

  await updateCallRecord(callRecordId, {
    provider_call_id: callSid || undefined,
    status: mapped,
    ...(duration ? { duration_seconds: duration } : {}),
    ...(['completed', 'failed', 'no-answer', 'busy'].includes(mapped)
      ? { completed_at: new Date().toISOString() } : {}),
  });

  return new NextResponse('OK');
}
