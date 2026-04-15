import { NextRequest, NextResponse } from 'next/server';
import { getCallById, updateCallRecord } from '@/lib/db';
import type { Intent } from '@/lib/types';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await getCallById(id);
  if (!call) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const intent: Intent = body.intent;
  if (!['YES', 'NO', 'UNCLEAR'].includes(intent)) {
    return NextResponse.json({ error: 'Invalid intent' }, { status: 400 });
  }
  await updateCallRecord(id, { intent });
  return NextResponse.json({ success: true });
}
