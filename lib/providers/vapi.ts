/**
 * VAPI provider — managed voice AI platform.
 *
 * Responsibilities:
 * - createVapiAssistant: provisions an Assistant on VAPI with our AgentConfig
 * - updateVapiAssistant: syncs changes when AgentConfig is edited
 * - deleteVapiAssistant: cleans up on campaign delete
 * - initiateVapiCall: starts an outbound call through VAPI
 *
 * VAPI API keys are stored in MongoDB settings (not env vars) so admins can
 * rotate them from the UI without redeploying.
 *
 * Docs: https://docs.vapi.ai
 */
import { getAllSettings } from '@/lib/db';
import type { AgentConfig } from '@/lib/types';
import { buildSystemPrompt, buildFirstMessage } from '@/lib/services/agent-prompt';

const VAPI_BASE = 'https://api.vapi.ai';

// ─── VAPI REST helpers ────────────────────────────────────────────────────────

async function vapiRequest(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<Response> {
  const settings = await getAllSettings();
  const apiKey = settings.vapi_api_key;
  if (!apiKey) throw new Error('VAPI API key not configured. Go to Admin → Settings.');

  return fetch(`${VAPI_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── Assistant lifecycle ──────────────────────────────────────────────────────

/**
 * Build the VAPI assistant payload from our AgentConfig.
 * Uses GPT-4o-mini as LLM and Azure hi-IN-SwaraNeural for TTS.
 */
async function buildAssistantPayload(
  agentConfig: AgentConfig,
  campaignName: string
) {
  const settings = await getAllSettings();
  const systemPrompt = buildSystemPrompt(agentConfig);
  const firstMessage = buildFirstMessage(agentConfig);

  return {
    name: campaignName,
    firstMessage,
    model: {
      provider: 'openai',
      model: settings.vapi_llm_model || 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.7,
      maxTokens: 150,
    },
    voice: {
      provider: 'azure',
      voiceId: settings.vapi_tts_voice || 'hi-IN-SwaraNeural',
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-3',
      language: 'hi',
    },
    // End call when silence detected after N seconds
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 600,
    endCallMessage: 'Thank you for your time. Have a great day. Goodbye.',
    endCallPhrases: ['goodbye', 'bye', 'alvida', 'thank you bye'],
    // VAPI sends end-of-call-report to our webhook
    serverUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/vapi`,
    serverUrlSecret: settings.vapi_webhook_secret || '',
    analysisPlan: {
      // VAPI will auto-generate a summary + success evaluation
      summaryPrompt:
        'Summarize this phone call in 2-3 sentences. Focus on what was discussed and any outcomes.',
      successEvaluationPrompt:
        'Did the agent successfully gather responses to all the questions? Answer Yes or No with a brief explanation.',
      successEvaluationRubric: 'PassFail',
    },
  };
}

/**
 * Create a new VAPI assistant for an agent campaign.
 * Returns the VAPI assistant ID.
 */
export async function createVapiAssistant(
  agentConfig: AgentConfig,
  campaignName: string
): Promise<string> {
  const payload = await buildAssistantPayload(agentConfig, campaignName);
  const res = await vapiRequest('/assistant', 'POST', payload);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`VAPI createAssistant failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.id as string;
}

/**
 * Update an existing VAPI assistant when AgentConfig changes.
 */
export async function updateVapiAssistant(
  vapiAssistantId: string,
  agentConfig: AgentConfig,
  campaignName: string
): Promise<void> {
  const payload = await buildAssistantPayload(agentConfig, campaignName);
  const res = await vapiRequest(`/assistant/${vapiAssistantId}`, 'PATCH', payload);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`VAPI updateAssistant failed (${res.status}): ${text}`);
  }
}

/**
 * Delete a VAPI assistant on campaign delete.
 * Silently ignores 404 (already deleted).
 */
export async function deleteVapiAssistant(vapiAssistantId: string): Promise<void> {
  const res = await vapiRequest(`/assistant/${vapiAssistantId}`, 'DELETE');
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    console.error(`VAPI deleteAssistant failed (${res.status}): ${text}`);
    // Non-fatal — campaign is deleted regardless
  }
}

// ─── Outbound call ────────────────────────────────────────────────────────────

/**
 * Initiate an outbound call via VAPI.
 * VAPI dials the phone number, connects to the assistant.
 */
export async function initiateVapiCall(params: {
  phoneNumber: string;
  vapiAssistantId: string;
  callRecordId: string;
  contactName?: string | null;
}): Promise<{ providerCallId: string }> {
  const settings = await getAllSettings();
  const phoneNumberId = settings.vapi_phone_number_id;
  if (!phoneNumberId) {
    throw new Error('VAPI phone number ID not configured. Go to Admin → Settings.');
  }

  const res = await vapiRequest('/call/phone', 'POST', {
    phoneNumberId,
    assistantId: params.vapiAssistantId,
    customer: {
      number: params.phoneNumber,
      ...(params.contactName ? { name: params.contactName } : {}),
    },
    // Pass our call_record_id so VAPI includes it in the webhook payload
    metadata: {
      call_record_id: params.callRecordId,
      ...(params.contactName ? { contact_name: params.contactName } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`VAPI initiateCall failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return { providerCallId: data.id as string };
}
