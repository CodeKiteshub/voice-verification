import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const campaignId = sp.get('campaign_id') ?? '';
  const callRecordId = sp.get('call_record_id') ?? '0';

  const ttsUrl = `${process.env.WEBHOOK_BASE_URL}/api/tts/${campaignId}`;
  const recordingCallback = `${process.env.WEBHOOK_BASE_URL}/api/webhook/vobiz/recording?call_record_id=${callRecordId}`;

  // Plivo-style XML:
  // - <Play> uses Sarvam AI TTS for native Hindi voice
  // - recordingCallbackUrl: async POST with recording details (Plivo/Vobiz style)
  // - action: where call flow continues after recording (returns hangup XML)
  // - After <Record>, call flow falls through to <Speak> + <Hangup>
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${ttsUrl}</Play>
  <Record maxLength="30" finishOnKey="#" playBeep="true" recordingCallbackUrl="${recordingCallback}" action="${recordingCallback}"/>
  <Speak language="hi-IN">आपके जवाब के लिए धन्यवाद। अलविदा।</Speak>
  <Hangup/>
</Response>`;

  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } });
}
