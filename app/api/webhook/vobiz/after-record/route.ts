import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyVobizWebhook } from '@/lib/auth';
import { updateCallRecord, getSetting } from '@/lib/db';
import { runStt } from '@/lib/services/stt';

// Called by Vobiz via <Record action="..."> after user finishes speaking.
// IMPORTANT: respond to Vobiz IMMEDIATELY — all DB work runs in after() background.
// Vobiz has a short window to receive the action URL response; any await before
// returning causes the thank-you audio to be skipped or cut off.
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

  // No recording = user did not respond — hang up silently, no thank-you.
  // DB update runs in background so we can return instantly.
  if (!recordingUrl) {
    if (callRecordId) {
      after(async () => {
        await updateCallRecord(callRecordId, {
          status: 'completed',
          intent: 'UNCLEAR',
          completed_at: new Date().toISOString(),
        });
      });
    }
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }

  // User responded — kick off all DB work + STT in background, return XML immediately.
  if (callRecordId) {
    after(async () => {
      await updateCallRecord(callRecordId, {
        recording_url: recordingUrl,       // fallback for audio player until full recording arrives
        stt_recording_url: recordingUrl,   // user-voice-only, used by STT
        recording_proxied: true,
        duration_seconds: duration || undefined,
        status: 'answered',
      });

      const sttEnabled = await getSetting('stt_enabled');
      if (sttEnabled !== 'false') {
        await runStt(callRecordId, recordingUrl, 'vobiz');
      }
    });
  }

  // Return XML immediately — Vobiz fetches + plays the thank-you URL while DB work runs in parallel
  const thankYouUrl = `${process.env.WEBHOOK_BASE_URL}/api/tts/thankyou`;
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Play>${thankYouUrl}</Play><Hangup/></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}
