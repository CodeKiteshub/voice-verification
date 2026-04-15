import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, createCampaign, getSetting } from '@/lib/db';
import type { Provider } from '@/lib/types';

export async function GET() {
  return NextResponse.json(await getCampaigns());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, question, provider, stt_enabled } = body;
  if (!name || !question) {
    return NextResponse.json({ error: 'name and question are required' }, { status: 400 });
  }
  const activeProvider = (provider ?? (await getSetting('active_provider')) ?? 'exotel') as Provider;
  const campaign = await createCampaign({
    name,
    question,
    provider: activeProvider,
    stt_enabled: stt_enabled ?? (await getSetting('stt_enabled')) !== 'false',
  });
  return NextResponse.json(campaign, { status: 201 });
}
