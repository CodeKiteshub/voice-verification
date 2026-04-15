import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ campaign_id: string }> }) {
  const { campaign_id } = await params;
  const campaign = await getCampaignById(campaign_id);
  if (!campaign) return new NextResponse('Not found', { status: 404 });

  try {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY!,
      },
      body: JSON.stringify({
        inputs: [campaign.question],
        target_language_code: 'en-IN',
        speaker: 'anushka',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 16000,
        enable_preprocessing: true,
        model: 'bulbul:v1',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[TTS] Sarvam error ${res.status}: ${errText}`);
      throw new Error(`Sarvam TTS failed: ${res.status} – ${errText}`);
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
    const msg = err?.message ?? String(err);
    console.error('[TTS] Error:', msg);
    return new NextResponse(`TTS failed: ${msg}`, { status: 502 });
  }
}
