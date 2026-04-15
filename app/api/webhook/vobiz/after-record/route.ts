import { NextRequest, NextResponse } from 'next/server';
import { updateCallRecord, getSetting } from '@/lib/db';
import { runStt } from '@/lib/services/stt';

// Called by Vobiz via <Record action="..."> after user finishes speaking.
// Saves the recording segment (for STT), then returns XML to play thank-you and hang up.
export async function POST(req: NextRequest) {
  const callRecordId = new URL(req.url).searchParams.get('call_record_id') ?? '';

  let body: Record<string, any> = {};
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) body = await req.json();
  else { const fd = await req.formData(); body = Object.fromEntries(fd.entries()); }

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
