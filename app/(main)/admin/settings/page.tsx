'use client';
import { useEffect, useState } from 'react';
import type { Settings } from '@/lib/types';

const SECTIONS = [
  {
    title: 'Telephony',
    fields: [
      { key: 'active_provider', label: 'Active Provider', type: 'select', options: [{ value: 'exotel', label: 'Exotel (Model EX)' }, { value: 'vobiz', label: 'Vobiz (Model VO)' }] },
      { key: 'stt_enabled', label: 'STT Enabled', type: 'select', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
      { key: 'tts_voice', label: 'Default TTS Voice', type: 'text', placeholder: 'anushka' },
    ],
  },
  {
    title: 'AI Agent Engine',
    fields: [
      { key: 'agent_engine', label: 'Default Agent Engine', type: 'select', options: [{ value: 'vapi', label: 'V-Engine (managed cloud AI)' }, { value: 'pipecat', label: 'Pipecat (custom, cheaper)' }] },
    ],
  },
  {
    title: 'V-Engine Configuration',
    description: 'Required for Cloud AI agent campaigns. Credentials from the V-Engine provider dashboard.',
    fields: [
      { key: 'vapi_api_key', label: 'VAPI API Key', type: 'password', placeholder: '…' },
      { key: 'vapi_phone_number_id', label: 'Phone Number ID', type: 'text', placeholder: 'phone_number_id from VAPI dashboard' },
      { key: 'vapi_webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'random 32-char string' },
      { key: 'vapi_voice_provider', label: 'Voice Provider', type: 'text', placeholder: '11labs · azure · playht · openai' },
      { key: 'vapi_voice_id', label: 'Voice ID', type: 'text', placeholder: 'ElevenLabs voice ID or Azure voice name' },
      { key: 'vapi_voice_model', label: 'Voice Model', type: 'text', placeholder: 'e.g. eleven_turbo_v2_5 (ElevenLabs only, leave blank for Azure)' },
      { key: 'vapi_llm_provider', label: 'LLM Provider', type: 'text', placeholder: 'openai · anthropic · together-ai · groq' },
      { key: 'vapi_llm_model', label: 'LLM Model', type: 'text', placeholder: 'e.g. gpt-4o · gpt-4o-mini · claude-3-5-sonnet-20241022' },
      { key: 'vapi_transcriber_language', label: 'Transcriber Language', type: 'text', placeholder: 'en · hi · hi-en (multilingual)' },
    ],
  },
  {
    title: 'Pipecat Configuration',
    description: 'Required for agent-pipecat campaigns. Deploy the pipecat-agent/ service first.',
    fields: [
      { key: 'pipecat_server_url', label: 'Pipecat Server URL', type: 'text', placeholder: 'wss://your-server.com' },
      { key: 'pipecat_tts_provider', label: 'TTS Provider', type: 'select', options: [{ value: 'sarvam', label: 'Sarvam Bulbul v2 (cheaper)' }, { value: 'azure', label: 'Azure Neural (lower latency)' }] },
    ],
  },
] as const;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Partial<Record<string, string>>>({});
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);
  const [error,   setError]     = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => setSettings(data))
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(await res.text());
      setSettings(await res.json());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Platform configuration — V-Engine credentials, Pipecat server, telephony defaults.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {SECTIONS.map(section => (
        <div key={section.title} className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-800">{section.title}</h2>
            {'description' in section && section.description && (
              <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
            )}
          </div>
          <div className="p-5 space-y-4">
            {section.fields.map(field => (
              <div key={field.key} className="grid grid-cols-3 gap-4 items-start">
                <label className="text-sm font-medium text-gray-700 pt-1.5">
                  {field.label}
                </label>
                <div className="col-span-2">
                  {field.type === 'select' ? (
                    <select
                      value={settings[field.key] ?? ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {(field as any).options.map((opt: { value: string; label: string }) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'password' ? 'password' : 'text'}
                      value={settings[field.key] ?? ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={'placeholder' in field ? field.placeholder : ''}
                      className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">✓ Saved</span>
        )}
      </div>
    </div>
  );
}
