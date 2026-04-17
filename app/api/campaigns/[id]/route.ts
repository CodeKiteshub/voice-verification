import { NextRequest, NextResponse } from 'next/server';
import { updateCampaign, deleteCampaign } from '@/lib/db';
import { requireApiSession, assertCampaignOwner } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const { id } = await params;
  const { campaign, error: ownerErr } = await assertCampaignOwner(id, session!);
  if (ownerErr) return ownerErr;

  return NextResponse.json(campaign);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const { id } = await params;
  const { error: ownerErr } = await assertCampaignOwner(id, session!);
  if (ownerErr) return ownerErr;

  const body = await req.json();
  const campaign = await updateCampaign(id, body);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const { id } = await params;
  const { error: ownerErr } = await assertCampaignOwner(id, session!);
  if (ownerErr) return ownerErr;

  await deleteCampaign(id);
  return new NextResponse(null, { status: 204 });
}
