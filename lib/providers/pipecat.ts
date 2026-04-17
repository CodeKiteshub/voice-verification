/**
 * Pipecat provider — custom voice AI engine via Exotel Voicebot Applet.
 *
 * How it works:
 * 1. Next.js trigger route calls initiateExotelVoicebotCall()
 * 2. Exotel dials the phone number using the Voicebot Applet
 * 3. When the contact picks up, Exotel opens a WebSocket to the Pipecat server:
 *    wss://pipecat.server/ws/{callId}?token={signed_token}
 * 4. Pipecat validates the HMAC token, fetches config from /api/internal/call-config/{callId}
 * 5. Real-time audio pipeline: Exotel PCM 8kHz ↔ Deepgram STT ↔ GPT-4o-mini ↔ Sarvam TTS
 * 6. On call end, Pipecat POSTs to /api/webhook/pipecat with full conversation
 *
 * Docs: https://pipecat.ai/docs/transports/exotel
 */
import crypto from 'crypto';

const EXOTEL_BASE = `https://${process.env.EXOTEL_API_KEY}:${process.env.EXOTEL_API_TOKEN}@${process.env.EXOTEL_SUBDOMAIN}/v1/Accounts/${process.env.EXOTEL_ACCOUNT_SID}`;

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

// ─── Exotel Voicebot Applet call ──────────────────────────────────────────────

/**
 * Initiate a call via Exotel using the Voicebot Applet.
 * Exotel will dial the phone number and connect the call to the Pipecat WebSocket.
 *
 * The Voicebot Applet URL includes the callRecordId and a signed token.
 * Pipecat uses the callRecordId to fetch AgentConfig from /api/internal/call-config/{id}.
 */
export async function initiateExotelVoicebotCall(params: {
  phoneNumber: string;
  callRecordId: string;
  pipecatServerUrl: string;
}): Promise<{ providerCallId: string }> {
  const { phoneNumber, callRecordId, pipecatServerUrl } = params;

  if (!pipecatServerUrl) {
    throw new Error('Pipecat server URL not configured. Go to Admin → Settings.');
  }

  const token = generateWsToken(callRecordId);
  // The Voicebot Applet URL is the WebSocket endpoint on the Pipecat server
  // Exotel will connect to this URL when the call is answered
  const voicebotUrl = `${pipecatServerUrl}/ws/${callRecordId}?token=${token}`;

  const statusCallbackUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhook/exotel/status?call_record_id=${callRecordId}`;

  const formData = new URLSearchParams({
    From: process.env.EXOTEL_CALLER_ID!,
    To: phoneNumber,
    // Exotel Voicebot Applet — bidirectional WebSocket audio streaming
    AppletType: 'voicebot',
    AppletId: voicebotUrl,
    StatusCallback: statusCallbackUrl,
    StatusCallbackEvents: 'terminal',
  });

  const res = await fetch(`${EXOTEL_BASE}/Calls.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Exotel Voicebot call failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const providerCallId = data?.Call?.Sid ?? '';
  if (!providerCallId) {
    throw new Error('Exotel returned no Call.Sid');
  }

  return { providerCallId };
}
