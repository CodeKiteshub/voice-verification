import { NextRequest, NextResponse } from 'next/server';
import { getCallById } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const call = await getCallById(params.id);
  if (!call) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(call);
}
