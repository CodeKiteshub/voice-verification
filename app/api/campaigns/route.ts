import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, createCampaign, updateCampaign, getSetting } from '@/lib/db';
import { requireApiSession } from '@/lib/auth';
import type { AgentConfig, CampaignType, Provider } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  // Admin can filter by a specific user; user always sees only their own
  const userIdFilter = session!.role === 'admin'
    ? (new URL(req.url).searchParams.get('user_id') ?? undefined)
    : session!.userId;

  return NextResponse.json(await getCampaigns(userIdFilter));
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireApiSession(req);
  if (error) return error;

  const body = await req.json();
  const {
    name,
    question,
    provider,
    stt_enabled,
    tts_voice,
    campaign_type,
    agent_config,
  } = body;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const type: CampaignType = campaign_type ?? 'verification';

  // Verification campaigns require a question
  if (type === 'verification' && !question) {
    return NextResponse.json({ error: 'question is required for verification campaigns' }, { status: 400 });
  }

  // Agent campaigns require agent_config
  if (type.startsWith('agent-') && !agent_config) {
    return NextResponse.json({ error: 'agent_config is required for agent campaigns' }, { status: 400 });
  }

  // Validate agent_config structure
  if (agent_config) {
    const { company_name, agent_role, knowledge_base, questions } = agent_config as AgentConfig;
    if (!company_name || !agent_role || !knowledge_base) {
      return NextResponse.json(
        { error: 'agent_config must include company_name, agent_role, and knowledge_base' },
        { status: 400 }
      );
    }
    if (!Array.isArray(questions) || questions.length < 1) {
      return NextResponse.json(
        { error: 'agent_config.questions must have at least one question' },
        { status: 400 }
      );
    }
    if (questions.length > 10) {
      return NextResponse.json(
        { error: 'agent_config.questions cannot exceed 10 questions' },
        { status: 400 }
      );
    }
    if (knowledge_base.length > 3000) {
      return NextResponse.json(
        { error: 'agent_config.knowledge_base cannot exceed 3000 characters' },
        { status: 400 }
      );
    }
  }

  const activeProvider = (provider ?? (await getSetting('active_provider')) ?? 'exotel') as Provider;
  const campaign = await createCampaign({
    user_id: session!.userId,
    name,
    question: type === 'verification' ? (question ?? '') : '',
    provider: activeProvider,
    stt_enabled: stt_enabled ?? (await getSetting('stt_enabled')) !== 'false',
    tts_voice: tts_voice ?? (await getSetting('tts_voice')) ?? 'anushka',
    campaign_type: type,
    ...(agent_config ? { agent_config } : {}),
    // VAPI assistant provisioning is async — start as pending
    ...(type === 'agent-vapi' ? { vapi_status: 'pending' } : {}),
  });

  // Provision VAPI assistant asynchronously (non-blocking)
  // Campaign is returned immediately with vapi_status: 'pending'
  if (type === 'agent-vapi') {
    provisionVapiAssistant(campaign.id, agent_config as AgentConfig, name).catch(console.error);
  }

  return NextResponse.json(campaign, { status: 201 });
}

/**
 * Async VAPI assistant provisioning — runs after the campaign is saved.
 * Updates vapi_assistant_id + vapi_status when done.
 * Marks vapi_status: 'failed' on error.
 */
async function provisionVapiAssistant(
  campaignId: string,
  agentConfig: AgentConfig,
  campaignName: string
): Promise<void> {
  try {
    const { createVapiAssistant } = await import('@/lib/providers/vapi');
    const assistantId = await createVapiAssistant(agentConfig, campaignName);
    await updateCampaign(campaignId, {
      vapi_assistant_id: assistantId,
      vapi_status: 'provisioned',
    });
  } catch (err) {
    console.error('[VAPI] provisioning failed for campaign', campaignId, err);
    await updateCampaign(campaignId, { vapi_status: 'failed' });
  }
}
