export type Provider = 'exotel' | 'vobiz';
export type Intent = 'YES' | 'NO' | 'UNCLEAR';
export type CallStatus =
  | 'initiated' | 'ringing' | 'answered'
  | 'completed' | 'failed' | 'no-answer' | 'busy';

export interface Campaign {
  id: string;
  name: string;
  question: string;
  provider: Provider;
  stt_enabled: boolean;
  tts_voice: string;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  call_count?: number;
}

export interface Contact {
  id: string;
  campaign_id: string;
  phone: string;
  name?: string;
}

export interface CallRecord {
  id: string;
  campaign_id: string;
  contact_id: string;
  phone: string;
  provider: Provider;
  provider_call_id?: string;
  status: CallStatus;
  recording_url?: string;
  recording_proxied: boolean;
  transcript?: string;
  intent?: Intent;
  duration_seconds?: number;
  called_at: string;
  completed_at?: string;
}

export interface Settings {
  active_provider: Provider;
  stt_enabled: boolean;
}

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
