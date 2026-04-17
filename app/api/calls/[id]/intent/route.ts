import { NextRequest, NextResponse } from 'next/server';
import { updateCallRecord } from '@/lib/db';
import { requireApiSession, assertCallOwner } from '@/lib/auth';
import type { Intent } from '@/lib/types';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const { id } = await params;
  const { error: ownerErr } = await assertCallOwner(id, session!);
  if (ownerErr) return ownerErr;

  const body = await req.json();
  const intent: Intent = body.intent;
  if (!['YES', 'NO', 'UNCLEAR'].includes(intent)) {
    return NextResponse.json({ error: 'Invalid intent' }, { status: 400 });
  }
  await updateCallRecord(id, { intent });
  return NextResponse.json({ success: true });
}
