import { NextResponse } from 'next/server';

const TEXT = 'Thank you for your response. Goodbye.';

export async function GET() {
  try {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY!,
      },
      body: JSON.stringify({
        inputs: [TEXT],
        target_language_code: 'en-IN',
        speaker: 'anushka',
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
      console.error(`[TTS/thankyou] Sarvam error ${res.status}: ${err}`);
      throw new Error(`Sarvam TTS failed: ${res.status}`);
    }

    const data = await res.json();
    const audioBase64: string = data.audios?.[0] ?? '';
    if (!audioBase64) throw new Error('No audio returned');

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error('[TTS/thankyou] Error:', err?.message);
    return new NextResponse('TTS failed', { status: 502 });
  }
}
