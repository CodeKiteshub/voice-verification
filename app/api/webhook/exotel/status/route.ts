import { NextRequest, NextResponse } from 'next/server';
import { updateCallRecord } from '@/lib/db';

const STATUS_MAP: Record<string, string> = {
  completed: 'completed', failed: 'failed', 'no-answer': 'no-answer',
  busy: 'busy', ringing: 'ringing', 'in-progress': 'answered',
};

export async function POST(req: NextRequest) {
  const callRecordId = new URL(req.url).searchParams.get('call_record_id') ?? '';
  const body = await req.formData();
  const callStatus = body.get('CallStatus')?.toString() ?? '';
  const callSid = body.get('CallSid')?.toString() ?? '';
  const duration = parseInt(body.get('CallDuration')?.toString() ?? '0');

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
