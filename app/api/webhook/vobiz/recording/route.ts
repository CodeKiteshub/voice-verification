import { NextRequest, NextResponse } from 'next/server';
import { verifyVobizWebhook } from '@/lib/auth';
import { updateCallRecord, getSetting } from '@/lib/db';
import { runStt } from '@/lib/services/stt';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyVobizWebhook(req, rawBody)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const callRecordId = new URL(req.url).searchParams.get('call_record_id') ?? '';

  // Parse body
  let body: Record<string, any> = {};
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = JSON.parse(rawBody || '{}');
  } else {
    const fd = new URLSearchParams(rawBody);
    body = Object.fromEntries(fd.entries());
  }

  // Plivo/Vobiz sends: RecordUrl, RecordingID, RecordingDuration, CallUUID
  const recordingUrl: string = body.RecordUrl ?? body.RecordingUrl ?? body.recording_url ?? '';
  const duration: number = parseInt(body.RecordingDuration ?? body.Duration ?? body.duration ?? '0');

  if (callRecordId && recordingUrl) {
    await updateCallRecord(callRecordId, {
      recording_url: recordingUrl,
      recording_proxied: true, // Vobiz recordings require auth — always proxy
      duration_seconds: duration || undefined,
      status: 'answered',
    });

    const sttEnabled = await getSetting('stt_enabled');
    if (sttEnabled !== 'false') {
      runStt(callRecordId, recordingUrl, 'vobiz').catch(console.error);
    }
  }

  // Return valid XML so Vobiz doesn't retry (when used as action URL)
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}
