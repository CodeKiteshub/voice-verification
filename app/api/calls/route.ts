import { NextRequest, NextResponse } from 'next/server';
import { getCallRecords } from '@/lib/db';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const campaign_id = sp.get('campaign_id') ?? undefined;
  const status = sp.get('status') ?? undefined;
  const intent = sp.get('intent') ?? undefined;
  const limit = sp.get('limit') ? parseInt(sp.get('limit')!) : undefined;
  return NextResponse.json(await getCallRecords({ campaign_id, status, intent, limit }));
}
