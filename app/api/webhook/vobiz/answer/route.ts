import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const campaignId = sp.get('campaign_id') ?? '';
  const callRecordId = sp.get('call_record_id') ?? '0';

  const ttsUrl = `${process.env.WEBHOOK_BASE_URL}/api/tts/${campaignId}`;
  // action: Vobiz POSTs recording data here after user stops speaking,
  // then follows the XML response (plays thank-you + hangs up)
  const afterRecordUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhook/vobiz/after-record?call_record_id=${callRecordId}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Wait length="2"/>
  <Play>${ttsUrl}</Play>
  <Record maxLength="15" finishOnKey="" playBeep="false" timeout="3" action="${afterRecordUrl}"/>
</Response>`;

  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } });
}
