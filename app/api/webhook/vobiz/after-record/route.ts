import { NextRequest, NextResponse } from 'next/server';
import { verifyVobizWebhook } from '@/lib/auth';
import { updateCallRecord, getSetting } from '@/lib/db';
import { runStt } from '@/lib/services/stt';

// Called by Vobiz via <Record action="..."> after user finishes speaking.
// Saves the recording segment (for STT), then returns XML to play thank-you and hang up.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyVobizWebhook(req, rawBody)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const callRecordId = new URL(req.url).searchParams.get('call_record_id') ?? '';

  // Parse body — Vobiz sends JSON or form-encoded depending on configuration
  let body: Record<string, any> = {};
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    body = JSON.parse(rawBody || '{}');
  } else {
    const fd = new URLSearchParams(rawBody);
    body = Object.fromEntries(fd.entries());
  }

  const recordingUrl: string = body.RecordUrl ?? body.RecordingUrl ?? body.recording_url ?? '';
  const duration: number = parseInt(body.RecordingDuration ?? body.Duration ?? body.duration ?? '0');

  if (callRecordId && recordingUrl) {
    await updateCallRecord(callRecordId, {
      recording_url: recordingUrl,
      recording_proxied: true,
      duration_seconds: duration || undefined,
      status: 'answered',
    });

    const sttEnabled = await getSetting('stt_enabled');
    if (sttEnabled !== 'false') {
      runStt(callRecordId, recordingUrl, 'vobiz').catch(console.error);
    }
  }

  // Return XML: play thank-you in Sarvam voice, then hang up
  const thankYouUrl = `${process.env.WEBHOOK_BASE_URL}/api/tts/thankyou`;
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Play>${thankYouUrl}</Play><Hangup/></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}
