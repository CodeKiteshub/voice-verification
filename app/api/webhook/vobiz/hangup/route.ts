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

  console.log('[Hangup webhook] call_record_id:', callRecordId, 'body:', JSON.stringify(body));

  const callUuid: string = body.CallUUID ?? body.call_uuid ?? '';
  const duration: number = parseInt(body.Duration ?? '0');
  const cause: string = body.HangupCause ?? '';
  const fullRecordingUrl: string =
    body.RecordUrl ?? body.RecordingUrl ?? body.recording_url ??
    body.record_url ?? body.RecordFile ?? body.record_file ?? '';

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

  // Full call recording from Vobiz record:true — both agent TTS + user voice mixed.
  // Always overwrite recording_url so the admin hears the full conversation in the player.
  if (fullRecordingUrl) {
    update.recording_url = fullRecordingUrl;
    update.recording_proxied = true;
  }

  await updateCallRecord(callRecordId, update);

  return new NextResponse('OK');
}
