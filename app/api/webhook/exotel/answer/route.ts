import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const campaignId = sp.get('campaign_id') ?? '';
  const callRecordId = sp.get('call_record_id') ?? '0';

  const ttsUrl = `${process.env.WEBHOOK_BASE_URL}/api/tts/${campaignId}`;
  const recordingAction = `${process.env.WEBHOOK_BASE_URL}/api/webhook/exotel/recording?call_record_id=${callRecordId}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${ttsUrl}</Play>
  <Record action="${recordingAction}" method="POST" maxLength="30" finishOnKey="#" playBeep="true" trim="trim-silence"/>
  <Say voice="woman" language="hi-IN">आपके जवाब के लिए धन्यवाद। अलविदा।</Say>
  <Hangup/>
</Response>`;

  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } });
}
