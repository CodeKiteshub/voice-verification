import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { verifyVobizWebhook } from '@/lib/auth';
import { updateCallRecord } from '@/lib/db';

// Receives the full call recording URL from Vobiz (triggered by record_url in the API call).
// This recording captures BOTH the agent TTS and the user's voice — it replaces the
// user-voice-only recording saved by after-record so the admin hears the full conversation.
// STT is NOT re-run here — after-record already ran it on the user-voice-only recording.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyVobizWebhook(req, rawBody)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const callRecordId = new URL(req.url).searchParams.get('call_record_id') ?? '';

  let body: Record<string, any> = {};
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = JSON.parse(rawBody || '{}');
  } else {
    const fd = new URLSearchParams(rawBody);
    body = Object.fromEntries(fd.entries());
  }

  // Vobiz sends: RecordUrl, RecordingID, RecordingDuration, CallUUID
  const recordingUrl: string = body.RecordUrl ?? body.RecordingUrl ?? body.recording_url ?? '';

  if (callRecordId && recordingUrl) {
    after(async () => {
      await updateCallRecord(callRecordId, {
        // Overwrite with full call recording (both sides) for the audio player
        recording_url: recordingUrl,
        recording_proxied: true,
      });
    });
  }

  return new NextResponse('OK');
}
