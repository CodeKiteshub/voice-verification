import type { TelephonyProvider } from './index';

export const vobizProvider: TelephonyProvider = {
  async initiateCall({ to, campaignId, contactId, callRecordId }) {
    const { VOBIZ_API_KEY, VOBIZ_CALLER_ID, WEBHOOK_BASE_URL } = process.env;

    const res = await fetch('https://api.vobiz.ai/v1/Call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOBIZ_API_KEY}`,
      },
      body: JSON.stringify({
        from: VOBIZ_CALLER_ID,
        to,
        answer_url: `${WEBHOOK_BASE_URL}/api/webhook/vobiz/answer?campaign_id=${campaignId}&contact_id=${contactId}&call_record_id=${callRecordId}`,
        hangup_url: `${WEBHOOK_BASE_URL}/api/webhook/vobiz/hangup?call_record_id=${callRecordId}`,
        record: true,
        time_limit: 120,
        machine_detection: true,
      }),
    });

    if (!res.ok) throw new Error(`Vobiz error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { providerCallId: data.call_uuid ?? data.CallUUID ?? '' };
  },
};
