import { NextRequest, NextResponse } from 'next/server';
import { updateCallRecord, getSetting } from '@/lib/db';
import { runStt } from '@/lib/services/stt';

export async function POST(req: NextRequest) {
  const callRecordId = new URL(req.url).searchParams.get('call_record_id') ?? '';

  let body: Record<string, any> = {};
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await req.json();
  } else {
    const fd = await req.formData();
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
