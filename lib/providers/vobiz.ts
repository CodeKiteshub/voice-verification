import type { TelephonyProvider } from './index';

export const vobizProvider: TelephonyProvider = {
  async initiateCall({ to, campaignId, contactId, callRecordId }) {
    const { VOBIZ_API_KEY, VOBIZ_AUTH_TOKEN, VOBIZ_CALLER_ID, WEBHOOK_BASE_URL } = process.env;

    const res = await fetch(`https://api.vobiz.ai/api/v1/Account/${VOBIZ_API_KEY}/Call/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-ID': VOBIZ_API_KEY!,
        'X-Auth-Token': VOBIZ_AUTH_TOKEN!,
      },
      body: JSON.stringify({
        from: VOBIZ_CALLER_ID,
        to,
        answer_url: `${WEBHOOK_BASE_URL}/api/webhook/vobiz/answer?campaign_id=${campaignId}&contact_id=${contactId}&call_record_id=${callRecordId}`,
        answer_method: 'POST',
        hangup_url: `${WEBHOOK_BASE_URL}/api/webhook/vobiz/hangup?call_record_id=${callRecordId}`,
        hangup_method: 'POST',
        record: true,
        time_limit: 120,
      }),
    });

    if (!res.ok) throw new Error(`Vobiz error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { providerCallId: data.request_uuid ?? data.call_uuid ?? data.CallUUID ?? '' };
  },
};
