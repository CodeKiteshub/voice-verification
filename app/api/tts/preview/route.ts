import { NextRequest, NextResponse } from 'next/server';
import { addSubtleNoise } from '@/lib/audio/noise';

const SAMPLE_TEXT = 'Hello, do you confirm your appointment for tomorrow at 10 AM? Please say yes or no after the tone.';

export async function GET(req: NextRequest) {
  const voice = new URL(req.url).searchParams.get('voice') ?? 'anushka';

  try {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY!,
      },
      body: JSON.stringify({
        inputs: [SAMPLE_TEXT],
        target_language_code: 'en-IN',
        speaker: voice,
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 16000,
        enable_preprocessing: true,
        model: 'bulbul:v2',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[TTS/preview] Sarvam error ${res.status}: ${err}`);
      return new NextResponse('Preview failed', { status: 502 });
    }

    const data = await res.json();
    const audioBase64: string = data.audios?.[0] ?? '';
    if (!audioBase64) return new NextResponse('No audio returned', { status: 502 });

    const audioBuffer = addSubtleNoise(Buffer.from(audioBase64, 'base64'));
    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[TTS/preview] Error:', err?.message);
    return new NextResponse('Preview failed', { status: 502 });
  }
}
