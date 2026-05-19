import { NextRequest, NextResponse } from 'next/server';
import { addSubtleNoise } from '@/lib/audio/noise';
import { generateTTS } from '@/lib/services/tts-generate';

const SAMPLE_TEXT = 'Hello, do you confirm your appointment for tomorrow at 10 AM? Please say yes or no.';

export async function GET(req: NextRequest) {
  const sp    = new URL(req.url).searchParams;
  const voice = sp.get('voice') ?? 'anushka';
  const text  = sp.get('text')?.trim() || SAMPLE_TEXT;

  try {
    const { audioBase64, usedVoice } = await generateTTS(text, voice);
    if (usedVoice !== voice) {
      console.warn(`[TTS/preview] Voice "${voice}" failed, fell back to "${usedVoice}"`);
    }

    const audioBuffer = addSubtleNoise(Buffer.from(audioBase64, 'base64'));
    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'no-store',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err: any) {
    console.error('[TTS/preview] Error:', err?.message);
    return new NextResponse('Preview failed', { status: 502 });
  }
}
