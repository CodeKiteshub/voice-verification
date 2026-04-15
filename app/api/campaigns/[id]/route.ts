import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById, deleteCampaign } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const campaign = await getCampaignById(params.id);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteCampaign(params.id);
  return new NextResponse(null, { status: 204 });
}
