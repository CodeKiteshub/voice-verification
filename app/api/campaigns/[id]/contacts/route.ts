import { NextRequest, NextResponse } from 'next/server';
import { getContacts, addContacts, getCampaignById } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(await getContacts(id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const contacts: { phone: string; name?: string }[] = body.contacts ?? [];
  if (!contacts.length) {
    return NextResponse.json({ error: 'contacts array is required' }, { status: 400 });
  }
  await addContacts(id, contacts);
  return NextResponse.json({ added: contacts.length }, { status: 201 });
}
