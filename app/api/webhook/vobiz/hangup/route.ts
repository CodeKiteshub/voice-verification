import { NextRequest, NextResponse } from 'next/server';
import { verifyVobizWebhook } from '@/lib/auth';
import { updateCallRecord } from '@/lib/db';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyVobizWebhook(req, rawBody)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const callRecordId = new URL(req.url).searchParams.get('call_record_id') ?? '';

  // Parse body
  let body: Record<string, any> = {};
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    body = JSON.parse(rawBody || '{}');
  } else {
    const fd = new URLSearchParams(rawBody);
    body = Object.fromEntries(fd.entries());
  }

  const callUuid: string = body.CallUUID ?? body.call_uuid ?? '';
  const duration: number = parseInt(body.Duration ?? '0');
  const cause: string = body.HangupCause ?? '';
  // Vobiz sends full call recording URL in hangup when record=true on the outbound call
  const fullRecordingUrl: string = body.RecordUrl ?? body.RecordingUrl ?? body.recording_url ?? '';

  const status =
    cause === 'NORMAL_CLEARING' ? 'completed' :
    cause === 'NO_ANSWER'       ? 'no-answer' :
    cause === 'USER_BUSY'       ? 'busy'       : 'failed';

  const update: Record<string, any> = {
    provider_call_id: callUuid || undefined,
    status,
    duration_seconds: duration || undefined,
    completed_at: new Date().toISOString(),
  };

  // If full call recording arrived here (and no segment recording saved yet), save it
  if (fullRecordingUrl) {
    update.recording_url = fullRecordingUrl;
    update.recording_proxied = true;
  }

  await updateCallRecord(callRecordId, update);

  return new NextResponse('OK');
}
