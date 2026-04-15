import type { TelephonyProvider } from './index';

export const exotelProvider: TelephonyProvider = {
  async initiateCall({ to, campaignId, contactId, callRecordId }) {
    const {
      EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_SUBDOMAIN,
      EXOTEL_ACCOUNT_SID, EXOTEL_CALLER_ID, WEBHOOK_BASE_URL,
    } = process.env;

    const url = `https://${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}@${EXOTEL_SUBDOMAIN}/v1/Accounts/${EXOTEL_ACCOUNT_SID}/Calls.json`;

    const body = new URLSearchParams({
      From: EXOTEL_CALLER_ID!,
      To: to,
      Url: `${WEBHOOK_BASE_URL}/api/webhook/exotel/answer?campaign_id=${campaignId}&contact_id=${contactId}&call_record_id=${callRecordId}`,
      StatusCallback: `${WEBHOOK_BASE_URL}/api/webhook/exotel/status?call_record_id=${callRecordId}`,
      Record: 'true',
      RecordingChannels: 'single',
    });

    const res = await fetch(url, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) throw new Error(`Exotel error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { providerCallId: data.Call?.Sid ?? '' };
  },
};
