import { NextRequest, NextResponse } from 'next/server';
import { verifyVobizWebhook } from '@/lib/auth';
import { getCampaignById } from '@/lib/db';

function startFullCallRecording(callUuid: string, callRecordId: string) {
  const { VOBIZ_API_KEY, VOBIZ_AUTH_TOKEN, WEBHOOK_BASE_URL } = process.env;
  if (!callUuid || !VOBIZ_API_KEY) return;

  const url = `https://api.vobiz.ai/api/v1/Account/${VOBIZ_API_KEY}/Call/${callUuid}/Record/`;
  const callbackUrl = `${WEBHOOK_BASE_URL}/api/webhook/vobiz/recording?call_record_id=${callRecordId}`;

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-ID': VOBIZ_API_KEY!,
      'X-Auth-Token': VOBIZ_AUTH_TOKEN!,
    },
    body: JSON.stringify({
      time_limit: 120,
      file_format: 'mp3',
      callback_url: callbackUrl,
      callback_method: 'POST',
    }),
  })
    .then(async (res) => {
      const text = await res.text();
      console.log(`[Answer] Start recording ${res.status} for ${callUuid}:`, text);
    })
    .catch((err) => {
      console.error(`[Answer] Start recording failed for ${callUuid}:`, err.message);
    });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyVobizWebhook(req, rawBody)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const campaignId = sp.get('campaign_id') ?? '';
  const callRecordId = sp.get('call_record_id') ?? '0';
  const base = process.env.WEBHOOK_BASE_URL;

  // Parse CallUUID from webhook body to start full call recording
  let body: Record<string, any> = {};
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    try { body = JSON.parse(rawBody || '{}'); } catch {}
  } else {
    body = Object.fromEntries(new URLSearchParams(rawBody).entries());
  }
  const callUuid = body.CallUUID ?? body.call_uuid ?? '';

  console.log('[Answer] CallUUID:', callUuid, 'campaign:', campaignId, 'body keys:', Object.keys(body).join(','));

  // Fire-and-forget: start full call recording via REST API before returning XML
  startFullCallRecording(callUuid, callRecordId);

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
