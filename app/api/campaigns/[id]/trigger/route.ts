import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById, getContacts, createCallRecord, updateCallRecord, getSetting } from '@/lib/db';
import { getProvider } from '@/lib/providers';
import type { Provider } from '@/lib/types';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const campaign = await getCampaignById(params.id);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const contacts = await getContacts(params.id);
  if (!contacts.length) return NextResponse.json({ error: 'No contacts' }, { status: 400 });

  const provider = ((await getSetting('active_provider')) as Provider) ?? 'exotel';
  const telephony = await getProvider(provider);
  const results = [];

  for (const contact of contacts) {
    const record = await createCallRecord({
      campaign_id: params.id,
      contact_id: contact.id,
      phone: contact.phone,
      provider,
    });

    try {
      const { providerCallId } = await telephony.initiateCall({
        to: contact.phone,
        campaignId: params.id,
        contactId: contact.id,
        callRecordId: record.id,
        question: campaign.question,
      });
      await updateCallRecord(record.id, { provider_call_id: providerCallId, status: 'ringing' });
      results.push({ phone: contact.phone, callRecordId: record.id, status: 'initiated' });
    } catch (err: any) {
      await updateCallRecord(record.id, { status: 'failed' });
      results.push({ phone: contact.phone, callRecordId: record.id, status: 'failed', error: err.message });
    }

    await new Promise(r => setTimeout(r, 500));
  }

  return NextResponse.json({ triggered: contacts.length, results });
}
