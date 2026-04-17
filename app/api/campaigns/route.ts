import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, createCampaign, getSetting } from '@/lib/db';
import { requireApiSession } from '@/lib/auth';
import type { Provider } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  // Admin can filter by a specific user; user always sees only their own
  const userIdFilter = session!.role === 'admin'
    ? (new URL(req.url).searchParams.get('user_id') ?? undefined)
    : session!.userId;

  return NextResponse.json(await getCampaigns(userIdFilter));
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const body = await req.json();
  const { name, question, provider, stt_enabled, tts_voice } = body;
  if (!name || !question) {
    return NextResponse.json({ error: 'name and question are required' }, { status: 400 });
  }
  const activeProvider = (provider ?? (await getSetting('active_provider')) ?? 'exotel') as Provider;
  const campaign = await createCampaign({
    user_id: session!.userId,
    name,
    question,
    provider: activeProvider,
    stt_enabled: stt_enabled ?? (await getSetting('stt_enabled')) !== 'false',
    tts_voice: tts_voice ?? (await getSetting('tts_voice')) ?? 'anushka',
  });
  return NextResponse.json(campaign, { status: 201 });
}
