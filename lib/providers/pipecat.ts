/**
 * Pipecat provider — custom voice AI engine via Vobiz bidirectional WebSocket streaming.
 *
 * How it works:
 * 1. Next.js trigger route calls initiateVobizPipecatCall()
 * 2. Vobiz dials the phone number
 * 3. When the contact picks up, Vobiz hits our answer webhook which returns
 *    <Stream bidirectional="true"> XML pointing to the Pipecat WebSocket:
 *    wss://pipecat.server/ws/{callId}?token={signed_token}
 * 4. Vobiz opens the WebSocket; Pipecat validates the HMAC token
 * 5. Real-time audio pipeline: Vobiz PCM 8kHz ↔ Deepgram STT ↔ GPT-4o-mini ↔ Sarvam TTS
 * 6. On call end, Pipecat POSTs to /api/webhook/pipecat with full conversation
 */
import crypto from 'crypto';

// ─── WebSocket token ──────────────────────────────────────────────────────────

/**
 * Generate a signed HMAC token for the Pipecat WebSocket connection.
 * The token is embedded in the WebSocket URL as a query parameter.
 * Pipecat validates it before accepting the connection.
 *
 * Token format: base64(callId:timestamp:hmac)
 * TTL: 60 seconds (enough time for Exotel to dial and connect)
 */
export function generateWsToken(callRecordId: string): string {
  const secret = process.env.PIPECAT_WEBHOOK_SECRET;
  if (!secret) throw new Error('PIPECAT_WEBHOOK_SECRET not configured');

  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${callRecordId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

/**
 * Verify a WebSocket token (used by the Pipecat Python server).
 * Exported so it can be tested; not used by Next.js directly.
 */
export function verifyWsToken(token: string, maxAgeSeconds = 60): string | null {
  try {
    const secret = process.env.PIPECAT_WEBHOOK_SECRET;
    if (!secret) return null;

    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;

    const [callRecordId, timestampStr, receivedHmac] = parts;
    const timestamp = parseInt(timestampStr);
    if (isNaN(timestamp)) return null;

    // Check TTL
    const age = Math.floor(Date.now() / 1000) - timestamp;
    if (age > maxAgeSeconds) return null;

    // Verify HMAC
    const payload = `${callRecordId}:${timestamp}`;
    const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const valid = crypto.timingSafeEqual(
      Buffer.from(receivedHmac),
      Buffer.from(expectedHmac)
    );
    return valid ? callRecordId : null;
  } catch {
    return null;
  }
}

// ─── Vobiz bidirectional streaming call ──────────────────────────────────────

export async function initiateVobizPipecatCall(params: {
  phoneNumber: string;
  callRecordId: string;
  pipecatServerUrl: string;
}): Promise<{ providerCallId: string }> {
  const { phoneNumber, callRecordId, pipecatServerUrl } = params;
  const { VOBIZ_API_KEY, VOBIZ_AUTH_TOKEN, VOBIZ_CALLER_ID, WEBHOOK_BASE_URL } = process.env;

  if (!pipecatServerUrl) {
    throw new Error('Pipecat server URL not configured. Go to Admin → Settings.');
  }

  const token = generateWsToken(callRecordId);

  const answerUrl = `${WEBHOOK_BASE_URL}/api/webhook/vobiz/pipecat-answer?call_record_id=${callRecordId}&pipecat_url=${encodeURIComponent(pipecatServerUrl)}&token=${encodeURIComponent(token)}`;
  const hangupUrl = `${WEBHOOK_BASE_URL}/api/webhook/vobiz/hangup?call_record_id=${callRecordId}`;

  const res = await fetch(`https://api.vobiz.ai/api/v1/Account/${VOBIZ_API_KEY}/Call/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-ID': VOBIZ_API_KEY!,
      'X-Auth-Token': VOBIZ_AUTH_TOKEN!,
    },
    body: JSON.stringify({
      from: VOBIZ_CALLER_ID,
      to: phoneNumber,
      answer_url: answerUrl,
      answer_method: 'POST',
      hangup_url: hangupUrl,
      hangup_method: 'POST',
      time_limit: 300,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vobiz Pipecat call failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return { providerCallId: data.request_uuid ?? data.call_uuid ?? data.CallUUID ?? '' };
}
