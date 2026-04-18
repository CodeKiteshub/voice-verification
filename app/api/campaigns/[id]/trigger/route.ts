import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  getContacts,
  createCallRecord,
  updateCallRecord,
  getAllSettings,
  getUserById,
  incrementCallsUsed,
  lockCampaignForTrigger,
  unlockCampaign,
  getCampaignById,
} from '@/lib/db';
import { getProvider } from '@/lib/providers';
import { requireApiSession, assertCampaignOwner } from '@/lib/auth';
import type { Provider } from '@/lib/types';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireApiSession(_req);
  if (error) return error;

  const { id } = await params;
  const { campaign, error: ownerErr } = await assertCampaignOwner(id, session!);
  if (ownerErr) return ownerErr;

  const contacts = await getContacts(id);
  if (!contacts.length) return NextResponse.json({ error: 'No contacts' }, { status: 400 });

  // ── Gate: VAPI must be provisioned before triggering ─────────────────────
  if (campaign!.campaign_type === 'agent-vapi') {
    if (campaign!.vapi_status !== 'provisioned') {
      const statusMsg =
        campaign!.vapi_status === 'failed'
          ? 'VAPI assistant provisioning failed. Please delete and recreate the campaign.'
          : 'VAPI assistant is still being provisioned. Please wait a moment and try again.';
      return NextResponse.json({ error: statusMsg }, { status: 400 });
    }
  }

  // ── Call limit enforcement ────────────────────────────────────────────────
  const user = await getUserById(session!.userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (user.call_limit !== -1) {
    const remaining = user.call_limit - user.calls_used;
    if (contacts.length > remaining) {
      return NextResponse.json({
        error: 'Call limit exceeded',
        remaining,
        requested: contacts.length,
        limit: user.call_limit,
        used: user.calls_used,
      }, { status: 403 });
    }
  }

  // ── Atomic lock: prevent double-trigger ──────────────────────────────────
  // Fix 4: findOneAndUpdate with { is_running: { $ne: true } }
  const locked = await lockCampaignForTrigger(id);
  if (!locked) {
    return NextResponse.json({ error: 'Campaign is already running' }, { status: 409 });
  }

  // Use the provider stored on the campaign (derived at creation from user.verification_provider).
  // DO NOT re-read active_provider here — that would ignore the per-user assignment.
  const provider = (campaign!.provider ?? 'exotel') as Provider;
  const campaignType = campaign!.campaign_type ?? 'verification';
  const userId = session!.userId;

  // ── Return 202 immediately; run the trigger loop in the background ────────
  // Fix 5: Next.js 15+ after() API — avoids 504 timeout for large campaigns
  after(async () => {
    let successCount = 0;
    try {
      for (const contact of contacts) {
        // Fix 7: Denormalize contact_name into call_record (avoids DB join in Pipecat)
        // Fix 2: Denormalize campaign_type into call_record (fixes Exotel status race)
        let record;
        try {
          record = await createCallRecord({
            campaign_id: id,
            contact_id: contact.id,
            user_id: userId,
            phone: contact.phone,
            provider,
            campaign_type: campaignType,
            contact_name: contact.name ?? null,
            ...(campaignType === 'agent-vapi' ? { agent_engine: 'vapi' } : {}),
            ...(campaignType === 'agent-pipecat' ? { agent_engine: 'pipecat' } : {}),
          });
        } catch (err: any) {
          // Fix 4: E11000 duplicate key = already triggered for this contact → skip
          if (err?.code === 11000) {
            console.warn(`[trigger] Skipping duplicate: contact ${contact.id}`);
            continue;
          }
          throw err;
        }

        try {
          let providerCallId: string;

          if (campaignType === 'agent-vapi') {
            // VAPI handles the call directly
            const { initiateVapiCall } = await import('@/lib/providers/vapi');
            const result = await initiateVapiCall({
              phoneNumber: contact.phone,
              vapiAssistantId: campaign!.vapi_assistant_id!,
              callRecordId: record.id,
              contactName: contact.name,
            });
            providerCallId = result.providerCallId;
          } else if (campaignType === 'agent-pipecat') {
            // Exotel Voicebot Applet → Pipecat WebSocket
            const { initiateExotelVoicebotCall } = await import('@/lib/providers/pipecat');
            const settings = await getAllSettings();
            const result = await initiateExotelVoicebotCall({
              phoneNumber: contact.phone,
              callRecordId: record.id,
              pipecatServerUrl: settings.pipecat_server_url,
            });
            providerCallId = result.providerCallId;
          } else {
            // Verification campaign — existing telephony provider
            const telephony = await getProvider(provider);
            const result = await telephony.initiateCall({
              to: contact.phone,
              campaignId: id,
              contactId: contact.id,
              callRecordId: record.id,
              question: campaign!.question,
            });
            providerCallId = result.providerCallId;
          }

          await updateCallRecord(record.id, { provider_call_id: providerCallId, status: 'ringing' });
          successCount++;
        } catch (err: any) {
          await updateCallRecord(record.id, { status: 'failed' });
          console.error(`[trigger] Call failed for ${contact.phone}:`, err.message);
        }

        // 500ms between calls to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      }

      // Increment call counter atomically
      if (successCount > 0) {
        await incrementCallsUsed(userId, successCount);
      }
    } finally {
      // Always release the lock, even on partial failure
      await unlockCampaign(id);
    }
  });

  return NextResponse.json(
    { message: 'Triggering calls...', count: contacts.length },
    { status: 202 }
  );
}
