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

  const recordingUrl: string = body.RecordUrl ?? body.recording_url ?? '';
  const duration: number = parseInt(body.Duration ?? body.duration ?? '0');

  await updateCallRecord(callRecordId, {
    recording_url: recordingUrl,
    recording_proxied: false,
    duration_seconds: duration || undefined,
    status: 'answered',
  });

  const sttEnabled = await getSetting('stt_enabled');
  if (sttEnabled !== 'false' && recordingUrl) {
    runStt(callRecordId, recordingUrl, 'vobiz').catch(console.error);
  }

  return new NextResponse('OK');
}
