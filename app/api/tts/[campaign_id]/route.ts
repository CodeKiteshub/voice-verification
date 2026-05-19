import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById } from '@/lib/db';
import { addSubtleNoise } from '@/lib/audio/noise';
import { generateTTS } from '@/lib/services/tts-generate';

export async function GET(req: NextRequest, { params }: { params: Promise<{ campaign_id: string }> }) {
  const { campaign_id } = await params;
  // voice_override lets the campaign page preview without saving
  const voiceOverride = new URL(req.url).searchParams.get('voice_override');

  const campaign = await getCampaignById(campaign_id);
  if (!campaign) return new NextResponse('Not found', { status: 404 });

  const requestedVoice = voiceOverride ?? campaign.tts_voice ?? 'anushka';

  try {
    const { audioBase64, usedVoice } = await generateTTS(campaign.question, requestedVoice);
    if (usedVoice !== requestedVoice) {
      console.warn(`[TTS] Voice "${requestedVoice}" failed, fell back to "anushka"`);
    }

    const audioBuffer = addSubtleNoise(Buffer.from(audioBase64, 'base64'));
    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(audioBuffer.length),
        'Accept-Ranges': 'bytes',
        'Cache-Control': voiceOverride ? 'no-store' : 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error('[TTS] Error:', err?.message);
    return new NextResponse(`TTS failed: ${err?.message}`, { status: 502 });
  }
}
