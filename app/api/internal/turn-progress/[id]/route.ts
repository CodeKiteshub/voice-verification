/**
 * POST /api/internal/turn-progress/:id
 *
 * Called by Pipecat Python service after each completed conversation turn.
 * Increments current_turn_index in MongoDB so the results UI can show
 * "Turn N in progress" for active Pipecat calls.
 *
 * Protected by INTERNAL_API_SECRET (Bearer token).
 * Body: { increment: number }  (always 1 in practice)
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyInternalApi } from '@/lib/auth';
import { incrementCallTurnIndex } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyInternalApi(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await incrementCallTurnIndex(id);

  return NextResponse.json({ ok: true });
}
