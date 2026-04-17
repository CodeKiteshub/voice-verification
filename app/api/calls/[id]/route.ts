import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession, assertCallOwner } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const { id } = await params;
  const { call, error: ownerErr } = await assertCallOwner(id, session!);
  if (ownerErr) return ownerErr;

  return NextResponse.json(call);
}
