/**
 * GET /api/internal/call-config/:id
 *
 * Called by the Pipecat Python service after a WebSocket connection is established.
 * Returns the AgentConfig + contact_name needed to build the system prompt.
 *
 * Protected by INTERNAL_API_SECRET (Bearer token).
 * Never exposed to the public internet — only called from the Pipecat server.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyInternalApi } from '@/lib/auth';
import { getCallById, getCampaignById } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyInternalApi(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const call = await getCallById(id);
  if (!call) {
    return NextResponse.json({ error: 'Call not found' }, { status: 404 });
  }

  const campaign = await getCampaignById(call.campaign_id);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (!campaign.agent_config) {
    return NextResponse.json({ error: 'Not an agent campaign' }, { status: 400 });
  }

  return NextResponse.json({
    call_id: call.id,
    campaign_id: campaign.id,
    agent_config: campaign.agent_config,
    contact_name: call.contact_name ?? null,
    phone: call.phone,
  });
}
