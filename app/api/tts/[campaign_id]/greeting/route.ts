import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById } from '@/lib/db';
import { addSubtleNoise } from '@/lib/audio/noise';
import { generateTTS } from '@/lib/services/tts-generate';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ campaign_id: string }> }) {
  const { campaign_id } = await params;

  const campaign = await getCampaignById(campaign_id);
  if (!campaign) return new NextResponse('Not found', { status: 404 });
  if (!campaign.greeting?.trim()) return new NextResponse('No greeting set', { status: 404 });

  const voice = campaign.tts_voice ?? 'anushka';

  try {
    const { audioBase64, usedVoice } = await generateTTS(campaign.greeting, voice);
    if (usedVoice !== voice) {
      console.warn(`[TTS/greeting] Voice "${voice}" failed, fell back to "${usedVoice}"`);
    }

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
