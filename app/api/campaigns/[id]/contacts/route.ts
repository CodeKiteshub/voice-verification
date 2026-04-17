import { NextRequest, NextResponse } from 'next/server';
import { getContacts, addContacts } from '@/lib/db';
import { requireApiSession, assertCampaignOwner } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const { id } = await params;
  const { error: ownerErr } = await assertCampaignOwner(id, session!);
  if (ownerErr) return ownerErr;

  return NextResponse.json(await getContacts(id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const { id } = await params;
  const { error: ownerErr } = await assertCampaignOwner(id, session!);
  if (ownerErr) return ownerErr;

  const body = await req.json();
  const contacts: { phone: string; name?: string }[] = body.contacts ?? [];
  if (!contacts.length) {
    return NextResponse.json({ error: 'contacts array is required' }, { status: 400 });
  }
  await addContacts(id, contacts);
  return NextResponse.json({ added: contacts.length }, { status: 201 });
}
