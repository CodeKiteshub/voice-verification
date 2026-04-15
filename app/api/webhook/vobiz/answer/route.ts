import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const campaignId = sp.get('campaign_id') ?? '';
  const callRecordId = sp.get('call_record_id') ?? '0';

  const ttsUrl = `${process.env.WEBHOOK_BASE_URL}/api/tts/${campaignId}`;
  const thankYouUrl = `${process.env.WEBHOOK_BASE_URL}/api/tts/thankyou`;
  const recordingCallback = `${process.env.WEBHOOK_BASE_URL}/api/webhook/vobiz/recording?call_record_id=${callRecordId}`;

  // - Both <Play> use Sarvam AI (same anushka voice — consistent throughout call)
  // - playBeep="false": no beep, natural conversation
  // - timeout="3": stops recording 3s after user stops speaking
  // - finishOnKey="": no key press needed
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${ttsUrl}</Play>
  <Record maxLength="15" finishOnKey="" playBeep="false" timeout="3" recordingCallbackUrl="${recordingCallback}"/>
  <Play>${thankYouUrl}</Play>
  <Hangup/>
</Response>`;

  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } });
}
