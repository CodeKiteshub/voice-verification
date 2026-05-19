import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById } from '@/lib/db';
import { addSubtleNoise } from '@/lib/audio/noise';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ campaign_id: string }> }) {
  const { campaign_id } = await params;

  const campaign = await getCampaignById(campaign_id);
  if (!campaign) return new NextResponse('Not found', { status: 404 });
  if (!campaign.greeting?.trim()) return new NextResponse('No greeting set', { status: 404 });

  const voice = campaign.tts_voice ?? 'anushka';

  try {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY!,
      },
      body: JSON.stringify({
        inputs: [campaign.greeting],
        target_language_code: 'en-IN',
        speaker: voice,
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: 'bulbul:v2',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[TTS/greeting] Sarvam error ${res.status}: ${errText}`);
      throw new Error(`Sarvam TTS failed: ${res.status}`);
    }

    const data = await res.json();
    const audioBase64: string = data.audios?.[0] ?? '';
    if (!audioBase64) throw new Error('No audio returned');

    const audioBuffer = addSubtleNoise(Buffer.from(audioBase64, 'base64'));
    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(audioBuffer.length),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error('[TTS/greeting] Error:', err?.message);
    return new NextResponse(`TTS failed: ${err?.message}`, { status: 502 });
  }
}
