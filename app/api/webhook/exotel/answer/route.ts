import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById } from '@/lib/db';

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function POST(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const campaignId = sp.get('campaign_id') ?? '';
  const callRecordId = sp.get('call_record_id') ?? '0';

  const campaign = await getCampaignById(campaignId);
  const question = escapeXml(campaign?.question ?? 'Please state your response after the beep.');
  const recordingAction = `${process.env.WEBHOOK_BASE_URL}/api/webhook/exotel/recording?call_record_id=${callRecordId}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman" language="en-IN">${question}</Say>
  <Record action="${recordingAction}" method="POST" maxLength="30" finishOnKey="#" playBeep="true" trim="trim-silence"/>
  <Say voice="woman" language="en-IN">Thank you for your response. Goodbye.</Say>
  <Hangup/>
</Response>`;

  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } });
}
