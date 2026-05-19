import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';
import { addSubtleNoise } from '@/lib/audio/noise';
import { generateTTS } from '@/lib/services/tts-generate';

const TEXT = 'Thank you for your response. Goodbye.';

const audioCache = new Map<string, Buffer>();

export async function GET() {
  const voice = (await getSetting('tts_voice')) ?? 'anushka';

  const cached = audioCache.get(voice);
  if (cached) {
    return new NextResponse(new Uint8Array(cached), {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(cached.length),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  try {
    const { audioBase64, usedVoice } = await generateTTS(TEXT, voice);
    if (usedVoice !== voice) {
      console.warn(`[TTS/thankyou] Voice "${voice}" failed, fell back to "${usedVoice}"`);
    }

    const audioBuffer = addSubtleNoise(Buffer.from(audioBase64, 'base64'));
    audioCache.set(usedVoice, audioBuffer);

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(audioBuffer.length),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error('[TTS/thankyou] Error:', err?.message);
    return new NextResponse('TTS failed', { status: 502 });
  }
}
