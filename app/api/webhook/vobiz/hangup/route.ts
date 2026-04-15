import { NextRequest, NextResponse } from 'next/server';
import { updateCallRecord } from '@/lib/db';

export async function POST(req: NextRequest) {
  const callRecordId = new URL(req.url).searchParams.get('call_record_id') ?? '';

  let body: Record<string, any> = {};
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) body = await req.json();
  else { const fd = await req.formData(); body = Object.fromEntries(fd.entries()); }

  const callUuid: string = body.CallUUID ?? body.call_uuid ?? '';
  const duration: number = parseInt(body.Duration ?? '0');
  const cause: string = body.HangupCause ?? '';

  const status =
    cause === 'NORMAL_CLEARING' ? 'completed' :
    cause === 'NO_ANSWER'       ? 'no-answer' :
    cause === 'USER_BUSY'       ? 'busy'       : 'failed';

  await updateCallRecord(callRecordId, {
    provider_call_id: callUuid || undefined,
    status,
    duration_seconds: duration || undefined,
    completed_at: new Date().toISOString(),
  });

  return new NextResponse('OK');
}
