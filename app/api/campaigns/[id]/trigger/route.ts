import { NextRequest, NextResponse } from 'next/server';
import { getContacts, createCallRecord, updateCallRecord, getSetting, getUserById, incrementCallsUsed } from '@/lib/db';
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

  const provider = ((await getSetting('active_provider')) as Provider) ?? 'exotel';
  const telephony = await getProvider(provider);
  const results = [];
  let successCount = 0;

  for (const contact of contacts) {
    const record = await createCallRecord({
      campaign_id: id,
      contact_id: contact.id,
      user_id: session!.userId,
      phone: contact.phone,
      provider,
    });

    try {
      const { providerCallId } = await telephony.initiateCall({
        to: contact.phone,
        campaignId: id,
        contactId: contact.id,
        callRecordId: record.id,
        question: campaign!.question,
      });
      await updateCallRecord(record.id, { provider_call_id: providerCallId, status: 'ringing' });
      results.push({ phone: contact.phone, callRecordId: record.id, status: 'initiated' });
      successCount++;
    } catch (err: any) {
      await updateCallRecord(record.id, { status: 'failed' });
      results.push({ phone: contact.phone, callRecordId: record.id, status: 'failed', error: err.message });
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // Increment call counter atomically
  if (successCount > 0) {
    await incrementCallsUsed(session!.userId, successCount);
  }

  return NextResponse.json({ triggered: contacts.length, results });
}
