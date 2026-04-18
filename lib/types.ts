export type Provider = 'exotel' | 'vobiz';
export type Intent = 'YES' | 'NO' | 'UNCLEAR';
export type CallStatus =
  | 'initiated' | 'ringing' | 'answered'
  | 'completed' | 'failed' | 'no-answer' | 'busy';
export type UserRole = 'admin' | 'user';

// ─── Agent / Campaign types ───────────────────────────────────────────────────

export type CampaignType = 'verification' | 'agent-vapi' | 'agent-pipecat';
export type AgentEngine = 'vapi' | 'pipecat';
export type VapiStatus = 'pending' | 'provisioned' | 'failed';

export interface AgentQuestion {
  id: string;       // UUID (stable React key)
  text: string;     // Question text spoken to caller
  order: number;    // 1-based sequence
}

export interface AgentConfig {
  company_name: string;
  agent_role: string;           // e.g. "Sales Agent", "Support Agent"
  knowledge_base: string;       // Free text injected into system prompt, max 3000 chars
  questions: AgentQuestion[];   // Min 1, max 10
  first_message?: string;       // Supports {{contact_name}}, {{company_name}} templates
}

export interface ConversationTurn {
  role: 'agent' | 'user';
  content: string;
  timestamp?: string;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  call_limit: number;            // -1 = unlimited
  calls_used: number;
  created_at: string;
  created_by?: string;           // ObjectId hex of admin who created this user
  // Per-user infrastructure assignments (set by admin, invisible to user)
  verification_provider?: Provider;  // Which telephony provider for verification calls
  agent_engine?: AgentEngine;        // Which AI engine for agent calls
}

// Internal use only — never sent to the client
export interface UserWithHash extends User {
  password_hash: string;
}

// ─── Campaign ────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  question: string;                   // Verification campaigns; empty string for agent campaigns
  campaign_type: CampaignType;        // Defaults to 'verification' for existing docs
  agent_config?: AgentConfig;         // Only present when campaign_type starts with 'agent-'
  vapi_assistant_id?: string;         // Internal — not exposed to UI
  vapi_status?: VapiStatus;           // Provisioning state for VAPI assistant
  is_running?: boolean;               // Atomic lock to prevent double-trigger
  provider: Provider;
  stt_enabled: boolean;
  tts_voice: string;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  call_count?: number;
}

// ─── Contact ─────────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  campaign_id: string;
  phone: string;
  name?: string;
}

// ─── CallRecord ──────────────────────────────────────────────────────────────

export interface CallRecord {
  id: string;
  campaign_id: string;
  contact_id: string;
  user_id: string;               // Denormalized from campaign for direct filtering
  campaign_type?: CampaignType;  // Denormalized from campaign (used by status webhook)
  contact_name?: string | null;  // Denormalized from contact (used by Pipecat first message)
  phone: string;
  provider: Provider;
  agent_engine?: AgentEngine;    // Which engine handled this call (agent campaigns only)
  provider_call_id?: string;
  status: CallStatus;
  recording_url?: string;
  recording_proxied: boolean;

  // Transcription fields
  transcript?: string;           // Verification: raw STT; VAPI: VAPI-formatted; legacy
  user_transcript?: string;      // Agent calls: user-only turns joined, used for intent
  transcript_format?: 'raw' | 'vapi' | 'pipecat';

  // Intent (applies to all campaign types)
  intent?: Intent;

  // Agent-specific fields
  conversation?: ConversationTurn[];  // Full turn-by-turn conversation
  full_transcript?: string;           // Joined human-readable transcript
  call_summary?: string;              // AI-generated summary
  success_evaluation?: string;        // Did the call achieve its goals?
  current_turn_index?: number;        // In-flight turn count (shown in results UI)

  duration_seconds?: number;
  called_at: string;
  completed_at?: string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface Settings {
  active_provider: Provider;
  stt_enabled: boolean;
  tts_voice: string;
  // Agent engine settings
  agent_engine: AgentEngine;
  vapi_api_key: string;
  vapi_phone_number_id: string;
  vapi_llm_model: string;
  vapi_tts_voice: string;
  vapi_webhook_secret: string;
  pipecat_server_url: string;
  pipecat_tts_provider: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  total: number;
  answered: number;
  completed: number;
  yes: number;
  no: number;
  unclear: number;
  failed: number;
  pending: number;
}
