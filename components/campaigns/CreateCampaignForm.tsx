'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NumbersUploader } from './NumbersUploader';
import { VoiceDropdown } from '@/components/settings/VoiceDropdown';
import { AgentConfigForm, defaultAgentConfig } from './AgentConfigForm';
import type { AgentConfig } from '@/lib/types';

interface Contact { phone: string; name?: string; }

// Simplified campaign intent shown to users.
// The actual engine/provider is derived server-side from their profile.
type CampaignIntent = 'verification' | 'agent';

const CAMPAIGN_TYPES: { value: CampaignIntent; label: string; description: string }[] = [
  {
    value: 'verification',
    label: 'Verification',
    description: 'Play a question and record a YES / NO / UNCLEAR response.',
  },
  {
    value: 'agent',
    label: 'AI Agent',
    description: 'Real conversational AI that chats with your contacts.',
  },
];

export function CreateCampaignForm() {
  const router = useRouter();
  const [campaignType, setCampaignType] = useState<CampaignIntent>('verification');
  const [name,         setName]         = useState('');
  const [question,     setQuestion]     = useState('');
  const [agentConfig,  setAgentConfig]  = useState<AgentConfig>(defaultAgentConfig);
  const [sttEnabled,   setSttEnabled]   = useState(true);
  const [ttsVoice,     setTtsVoice]     = useState('anushka');
  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const isAgent = campaignType === 'agent';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contacts.length) { setError('Add at least one phone number'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          // Send the simplified type; server maps 'agent' → 'agent-vapi' or 'agent-pipecat'
          // based on the user's assigned agent_engine (set by admin).
          campaign_type: campaignType,
          ...(isAgent
            ? { agent_config: agentConfig }
            : { question, stt_enabled: sttEnabled, tts_voice: ttsVoice }),
          // No provider sent — server derives it from user's verification_provider setting
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error ?? 'Failed to create campaign');
      }
      const campaign = await res.json();

      const res2 = await fetch(`/api/campaigns/${campaign.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      });
      if (!res2.ok) throw new Error(await res2.text());

      router.push(`/campaigns/${campaign.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Campaign Type Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Campaign Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CAMPAIGN_TYPES.map(ct => (
            <button
              key={ct.value}
              type="button"
              onClick={() => setCampaignType(ct.value)}
              className={`text-left rounded-xl border-2 px-4 py-3 transition-all ${
                campaignType === ct.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-semibold text-gray-800">{ct.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{ct.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
        <input
          required value={name} onChange={e => setName(e.target.value)}
          className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Q2 Verification Drive"
        />
      </div>

      {/* ── Verification fields ── */}
      {!isAgent && (
        <>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Question <span className="text-gray-400 font-normal">(spoken to the user)</span>
            </label>
            <textarea
              required value={question} onChange={e => setQuestion(e.target.value)}
              rows={3}
              className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Do you confirm your appointment for tomorrow at 10am?"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              TTS Voice
              <span className="ml-1.5 text-xs text-gray-400 font-normal">
                — press Preview to hear {question.trim() ? 'your question' : 'a sample'}
              </span>
            </label>
            <VoiceDropdown
              value={ttsVoice}
              onChange={setTtsVoice}
              previewText={question.trim() || undefined}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Auto Transcribe</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={sttEnabled}
                onChange={e => setSttEnabled(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600">Enable STT (auto YES / NO / UNCLEAR)</span>
            </label>
          </div>
        </>
      )}

      {/* ── Agent fields ── */}
      {isAgent && (
        <div className="rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Agent Configuration</h3>
          <AgentConfigForm value={agentConfig} onChange={setAgentConfig} />
        </div>
      )}

      {/* Contacts */}
      <NumbersUploader onChange={setContacts} />

      <button
        type="submit" disabled={loading}
        className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Creating…' : 'Create Campaign'}
      </button>
    </form>
  );
}
