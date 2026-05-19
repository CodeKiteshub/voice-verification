import { NextRequest, NextResponse } from 'next/server';
import { verifyVobizWebhook } from '@/lib/auth';
import { getCampaignById } from '@/lib/db';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyVobizWebhook(req, rawBody)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const campaignId = sp.get('campaign_id') ?? '';
  const callRecordId = sp.get('call_record_id') ?? '0';
  const base = process.env.WEBHOOK_BASE_URL;

  const greetingUrl    = `${base}/api/tts/${campaignId}/greeting`;
  const questionUrl    = `${base}/api/tts/${campaignId}`;
  const afterRecordUrl = `${base}/api/webhook/vobiz/after-record?call_record_id=${callRecordId}`;

  const campaign = await getCampaignById(campaignId);
  const hasGreeting = !!campaign?.greeting?.trim();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Wait length="1"/>
${hasGreeting ? `  <Play>${greetingUrl}</Play>\n` : ''
}  <Play>${questionUrl}</Play>
  <Record maxLength="15" finishOnKey="" playBeep="false" timeout="3" action="${afterRecordUrl}"/>
</Response>`;

  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } });
}
