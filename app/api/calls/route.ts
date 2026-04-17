import { NextRequest, NextResponse } from 'next/server';
import { getCallRecords } from '@/lib/db';
import { requireApiSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const sp = new URL(req.url).searchParams;
  const campaign_id = sp.get('campaign_id') ?? undefined;
  const status = sp.get('status') ?? undefined;
  const intent = sp.get('intent') ?? undefined;
  const limit = sp.get('limit') ? parseInt(sp.get('limit')!) : undefined;

  // Admin can filter by a specific user via ?user_id=; user always sees only their own
  const user_id = session!.role === 'admin'
    ? (sp.get('user_id') ?? undefined)
    : session!.userId;

  return NextResponse.json(await getCallRecords({ campaign_id, user_id, status, intent, limit }));
}
