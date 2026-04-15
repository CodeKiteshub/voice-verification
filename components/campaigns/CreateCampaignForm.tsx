'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NumbersUploader } from './NumbersUploader';
import { VoiceDropdown } from '@/components/settings/VoiceDropdown';
import type { Provider } from '@/lib/types';

interface Contact { phone: string; name?: string; }

export function CreateCampaignForm() {
  const router = useRouter();
  const [name,       setName]       = useState('');
  const [question,   setQuestion]   = useState('');
  const [provider,   setProvider]   = useState<Provider>('exotel');
  const [sttEnabled, setSttEnabled] = useState(true);
  const [ttsVoice,   setTtsVoice]   = useState('anushka');
  const [contacts,   setContacts]   = useState<Contact[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contacts.length) { setError('Add at least one phone number'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, question, provider, stt_enabled: sttEnabled, tts_voice: ttsVoice }),
      });
      if (!res.ok) throw new Error(await res.text());
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
    <form onSubmit={submit} className="space-y-5 max-w-xl">
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Campaign Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
        <input
          required value={name} onChange={e => setName(e.target.value)}
          className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Q2 Verification Drive"
        />
      </div>

      {/* Question */}
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

      {/* Voice */}
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

      {/* Provider + STT row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Provider</label>
          <select
            value={provider}
            onChange={e => setProvider(e.target.value as Provider)}
            className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="exotel">Model EX</option>
            <option value="vobiz">Model VO</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Auto Transcribe</label>
          <label className="flex items-center gap-2 mt-2.5 cursor-pointer">
            <input
              type="checkbox" checked={sttEnabled}
              onChange={e => setSttEnabled(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600">Enable STT</span>
          </label>
        </div>
      </div>

      {/* Numbers */}
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
