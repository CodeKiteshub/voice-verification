import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  // Re-read from DB to get fresh calls_used
  const user = await getUserById(session!.userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.is_active,
    callLimit: user.call_limit,
    callsUsed: user.calls_used,
  });
}
