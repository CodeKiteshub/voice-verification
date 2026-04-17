import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById, updateCampaign, deleteCampaign } from '@/lib/db';
import { requireApiSession, assertCampaignOwner } from '@/lib/auth';
import type { AgentConfig } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const { id } = await params;
  const { campaign, error: ownerErr } = await assertCampaignOwner(id, session!);
  if (ownerErr) return ownerErr;

  return NextResponse.json(campaign);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const { id } = await params;
  const { campaign: existing, error: ownerErr } = await assertCampaignOwner(id, session!);
  if (ownerErr) return ownerErr;

  const body = await req.json();
  const campaign = await updateCampaign(id, body);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // If agent_config changed on a VAPI campaign, sync the VAPI assistant
  if (
    existing?.campaign_type === 'agent-vapi' &&
    existing.vapi_assistant_id &&
    existing.vapi_status === 'provisioned' &&
    body.agent_config
  ) {
    syncVapiAssistant(
      existing.vapi_assistant_id,
      body.agent_config as AgentConfig,
      campaign.name
    ).catch(console.error);
  }

  return NextResponse.json(campaign);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const { id } = await params;
  const { campaign, error: ownerErr } = await assertCampaignOwner(id, session!);
  if (ownerErr) return ownerErr;

  // Clean up VAPI assistant before deleting the campaign
  if (campaign?.campaign_type === 'agent-vapi' && campaign.vapi_assistant_id) {
    cleanupVapiAssistant(campaign.vapi_assistant_id).catch(console.error);
  }

  await deleteCampaign(id);
  return new NextResponse(null, { status: 204 });
}

/**
 * Sync VAPI assistant after AgentConfig is updated.
 * Non-blocking — campaign is already updated in MongoDB.
 */
async function syncVapiAssistant(
  vapiAssistantId: string,
  agentConfig: AgentConfig,
  campaignName: string
): Promise<void> {
  const { updateVapiAssistant } = await import('@/lib/providers/vapi');
  await updateVapiAssistant(vapiAssistantId, agentConfig, campaignName);
}

/**
 * Delete VAPI assistant when campaign is deleted.
 * Non-blocking — campaign deletion proceeds regardless.
 */
async function cleanupVapiAssistant(vapiAssistantId: string): Promise<void> {
  const { deleteVapiAssistant } = await import('@/lib/providers/vapi');
  await deleteVapiAssistant(vapiAssistantId);
}
