import { NextRequest, NextResponse } from 'next/server';
import { getCallById } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await getCallById(id);
  if (!call) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(call);
}
