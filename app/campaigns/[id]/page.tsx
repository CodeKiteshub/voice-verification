'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Campaign, Contact } from '@/lib/types';
import { Phone, Trash2 } from 'lucide-react';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ triggered: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/campaigns/${id}`).then(r => r.json()).then(setCampaign);
    fetch(`/api/campaigns/${id}/contacts`).then(r => r.json()).then(setContacts);
  }, [id]);

  const trigger = async () => {
    setTriggering(true);
    setError('');
    try {
      const res = await fetch(`/api/campaigns/${id}/trigger`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      setTriggerResult(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTriggering(false);
    }
  };

  const deleteCampaign = async () => {
    if (!confirm('Delete this campaign and all its data?')) return;
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    router.push('/campaigns');
  };

  if (!campaign) return <div className="text-gray-400 animate-pulse">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Provider: <span className="font-medium">{campaign.provider === 'exotel' ? 'Model EX' : campaign.provider === 'vobiz' ? 'Model VO' : campaign.provider}</span>
            {' · '}STT: <span className="font-medium">{campaign.stt_enabled ? 'On' : 'Off'}</span>
          </p>
        </div>
        <button onClick={deleteCampaign} className="text-gray-400 hover:text-red-500 transition-colors p-2" title="Delete campaign">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Question</h3>
        <p className="text-gray-900">{campaign.question}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Contacts ({contacts.length})</h3>
        {contacts.length === 0 ? (
          <p className="text-gray-400 text-sm">No contacts added</p>
        ) : (
          <ul className="space-y-1">
            {contacts.map(c => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-gray-700">{c.phone}</span>
                {c.name && <span className="text-gray-400">({c.name})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}
      {triggerResult && (
        <div className="bg-green-50 text-green-800 border border-green-200 rounded-lg px-4 py-3 text-sm">
          Triggered {triggerResult.triggered} calls.{' '}
          <a href="/results" className="underline font-medium">View Results →</a>
        </div>
      )}
      <button onClick={trigger} disabled={triggering || contacts.length === 0}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        <Phone className="w-4 h-4" />
        {triggering ? 'Calling…' : `Start Calling (${contacts.length} contacts)`}
      </button>
    </div>
  );
}
