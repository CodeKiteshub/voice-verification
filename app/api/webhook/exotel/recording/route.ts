import { NextRequest, NextResponse } from 'next/server';
import { verifyExotelWebhook } from '@/lib/auth';
import { updateCallRecord, getSetting } from '@/lib/db';
import { runStt } from '@/lib/services/stt';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyExotelWebhook(req, rawBody)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const callRecordId = new URL(req.url).searchParams.get('call_record_id') ?? '';

  // Parse URL-encoded body manually (body already consumed as text)
  const body = new URLSearchParams(rawBody);
  const recordingUrl = body.get('RecordingUrl') ?? '';
  const duration = parseInt(body.get('RecordingDuration') ?? '0');

  await updateCallRecord(callRecordId, {
    recording_url: recordingUrl,
    recording_proxied: true,
    duration_seconds: duration || undefined,
    status: 'answered',
  });

  const sttEnabled = await getSetting('stt_enabled');
  if (sttEnabled !== 'false' && recordingUrl) {
    runStt(callRecordId, recordingUrl, 'exotel').catch(console.error);
  }

  return new NextResponse('OK');
}
