'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NumbersUploader } from './NumbersUploader';
import type { Provider } from '@/lib/types';

interface Contact { phone: string; name?: string; }

export function CreateCampaignForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  const [provider, setProvider] = useState<Provider>('exotel');
  const [sttEnabled, setSttEnabled] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contacts.length) { setError('Add at least one phone number'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, question, provider, stt_enabled: sttEnabled }),
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
    <form onSubmit={submit} className="space-y-6 max-w-xl">
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
        <input required value={name} onChange={e => setName(e.target.value)}
          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Q2 Verification Drive"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Question (spoken via TTS)</label>
        <textarea required value={question} onChange={e => setQuestion(e.target.value)} rows={3}
          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Do you confirm your appointment for tomorrow at 10am?"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Telephony Provider</label>
        <select value={provider} onChange={e => setProvider(e.target.value as Provider)}
          className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="exotel">Exotel</option>
          <option value="vobiz">Vobiz</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="stt" checked={sttEnabled} onChange={e => setSttEnabled(e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="stt" className="text-sm text-gray-700">Enable auto-transcription (STT)</label>
      </div>
      <NumbersUploader onChange={setContacts} />
      <button type="submit" disabled={loading}
        className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Creating…' : 'Create Campaign'}
      </button>
    </form>
  );
}
