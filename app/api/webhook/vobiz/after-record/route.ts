import { NextRequest, NextResponse } from 'next/server';
import { verifyVobizWebhook } from '@/lib/auth';
import { updateCallRecord, getSetting } from '@/lib/db';
import { runStt } from '@/lib/services/stt';

// Called by Vobiz via <Record action="..."> after user finishes speaking.
// If user responded: saves recording, runs STT, plays thank-you, hangs up.
// If user said nothing (timeout with no audio): hangs up immediately, no thank-you.
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

  // No recording = user did not respond — hang up silently, no thank-you
  if (!recordingUrl) {
    if (callRecordId) {
      await updateCallRecord(callRecordId, {
        status: 'completed',
        intent: 'UNCLEAR',
        completed_at: new Date().toISOString(),
      });
    }
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  // User responded — save user-voice recording for STT + playback fallback
  if (callRecordId) {
    await updateCallRecord(callRecordId, {
      recording_url: recordingUrl,       // fallback for audio player until full recording arrives
      stt_recording_url: recordingUrl,   // user-voice-only, used by STT
      recording_proxied: true,
      duration_seconds: duration || undefined,
      status: 'answered',
    });

    const sttEnabled = await getSetting('stt_enabled');
    if (sttEnabled !== 'false') {
      runStt(callRecordId, recordingUrl, 'vobiz').catch(console.error);
    }
  }

  // Play thank-you then hang up
  const thankYouUrl = `${process.env.WEBHOOK_BASE_URL}/api/tts/thankyou`;
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Play>${thankYouUrl}</Play><Hangup/></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}
