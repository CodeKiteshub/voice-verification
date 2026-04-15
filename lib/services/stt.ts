import { updateCallRecord } from '@/lib/db';
import { extractIntent } from './intent';
import type { Provider } from '@/lib/types';
import FormData from 'form-data';

export async function runStt(callRecordId: string, recordingUrl: string, provider: Provider): Promise<void> {
  try {
    const audioBuffer = await downloadRecording(recordingUrl, provider);
    const transcript = await transcribeWithSarvam(audioBuffer);
    const intent = extractIntent(transcript);

    await updateCallRecord(callRecordId, {
      transcript,
      intent,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[STT] Failed for call ${callRecordId}:`, err);
    await updateCallRecord(callRecordId, { status: 'completed', completed_at: new Date().toISOString() });
  }
}

async function downloadRecording(url: string, provider: Provider): Promise<Buffer> {
  const headers: Record<string, string> = {};
  if (provider === 'exotel') {
    const creds = Buffer.from(`${process.env.EXOTEL_API_KEY}:${process.env.EXOTEL_API_TOKEN}`).toString('base64');
    headers['Authorization'] = `Basic ${creds}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Audio download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function transcribeWithSarvam(audioBuffer: Buffer): Promise<string> {
  const fd = new FormData();
  fd.append('file', audioBuffer, { filename: 'recording.mp3', contentType: 'audio/mpeg' });
  fd.append('model', 'saarika:v2');
  fd.append('language_code', 'unknown');

  const res = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: { 'api-subscription-key': process.env.SARVAM_API_KEY!, ...fd.getHeaders() },
    body: fd.getBuffer() as unknown as BodyInit,
  });

  if (!res.ok) throw new Error(`Sarvam STT failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.transcript ?? '';
}
