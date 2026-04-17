'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Campaign, Contact } from '@/lib/types';
import { Phone, Trash2, Pencil, X, Check } from 'lucide-react';
import { VoiceDropdown, VOICES } from '@/components/settings/VoiceDropdown';

function voiceLabel(id: string) {
  return VOICES.find(v => v.id === id)?.label ?? id;
}

export default function CampaignDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [campaign,  setCampaign]  = useState<Campaign | null>(null);
  const [contacts,  setContacts]  = useState<Contact[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ triggered: number } | null>(null);
  const [error, setError] = useState('');

  // Edit state
  const [editing,   setEditing]   = useState(false);
  const [editName,  setEditName]  = useState('');
  const [editQ,     setEditQ]     = useState('');
  const [editVoice, setEditVoice] = useState('anushka');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/campaigns/${id}`).then(r => r.json()),
      fetch(`/api/campaigns/${id}/contacts`).then(r => r.json()),
    ]).then(([c, ct]) => {
      setCampaign(c);
      setContacts(ct);
    });
  }, [id]);

  const startEdit = () => {
    if (!campaign) return;
    setEditName(campaign.name);
    setEditQ(campaign.question);
    setEditVoice(campaign.tts_voice ?? 'anushka');
    setEditing(true);
    setError('');
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!editName.trim() || !editQ.trim()) { setError('Name and question are required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), question: editQ.trim(), tts_voice: editVoice }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCampaign(await res.json());
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

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

  if (!campaign) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm animate-pulse">
        Loading campaign…
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900 truncate">{campaign.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
            <span>{campaign.provider === 'exotel' ? 'Model EX' : 'Model VO'}</span>
            <span>·</span>
            <span>Voice: {voiceLabel(campaign.tts_voice ?? 'anushka').split('—')[0].trim()}</span>
            <span>·</span>
            <span>STT: {campaign.stt_enabled ? 'On' : 'Off'}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={deleteCampaign}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Delete campaign"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Edit Form ── */}
      {editing && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-800">Edit Campaign</h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Campaign Name</label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">Question (spoken via TTS)</label>
            <textarea
              value={editQ}
              onChange={e => setEditQ(e.target.value)}
              rows={3}
              className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600">
              TTS Voice
              <span className="ml-1 text-gray-400 font-normal">
                — press Preview to hear your question in this voice
              </span>
            </label>
            <VoiceDropdown
              value={editVoice}
              onChange={setEditVoice}
              previewText={editQ.trim() || undefined}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Question (read-only) ── */}
      {!editing && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 mb-1.5">Question</p>
          <p className="text-gray-800 text-sm leading-relaxed">{campaign.question}</p>
        </div>
      )}

      {/* ── Contacts ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Contacts <span className="text-gray-400 font-normal">({contacts.length})</span>
        </h3>
        {contacts.length === 0 ? (
          <p className="text-gray-400 text-sm">No contacts added</p>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
            {contacts.map(c => (
              <li key={c.id} className="py-1.5 flex items-center gap-2 text-sm">
                <span className="font-mono text-gray-700">{c.phone}</span>
                {c.name && <span className="text-gray-400 text-xs">({c.name})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Errors / Result ── */}
      {error && !editing && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {triggerResult && (
        <div className="bg-green-50 text-green-800 border border-green-200 rounded-lg px-4 py-3 text-sm">
          ✓ Triggered {triggerResult.triggered} call{triggerResult.triggered !== 1 ? 's' : ''}.{' '}
          <a href="/results" className="underline font-medium">View Results →</a>
        </div>
      )}

      {/* ── Trigger ── */}
      <button
        onClick={trigger}
        disabled={triggering || contacts.length === 0}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
      >
        <Phone className="w-4 h-4" />
        {triggering ? 'Dialling…' : `Start Calling  (${contacts.length} contact${contacts.length !== 1 ? 's' : ''})`}
      </button>
    </div>
  );
}
