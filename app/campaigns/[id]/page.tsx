'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Campaign, Contact } from '@/lib/types';
import { Phone, Trash2, Pencil, X, Check, Play, Square } from 'lucide-react';
import { VoiceSelector } from '@/components/settings/VoiceSelector';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [campaign,    setCampaign]    = useState<Campaign | null>(null);
  const [contacts,    setContacts]    = useState<Contact[]>([]);
  const [ttsVoice,    setTtsVoice]    = useState('anushka');
  const [triggering,  setTriggering]  = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ triggered: number } | null>(null);
  const [error,       setError]       = useState('');

  // Edit state
  const [editing,     setEditing]     = useState(false);
  const [editName,    setEditName]    = useState('');
  const [editQ,       setEditQ]       = useState('');
  const [saving,      setSaving]      = useState(false);

  // Question preview
  const [previewing,  setPreviewing]  = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/campaigns/${id}`).then(r => r.json()),
      fetch(`/api/campaigns/${id}/contacts`).then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([c, ct, s]) => {
      setCampaign(c);
      setContacts(ct);
      setTtsVoice(s.tts_voice ?? 'anushka');
    });
  }, [id]);

  // Keep voice in sync when changed via selector
  const handleVoiceChange = () => {
    fetch('/api/settings').then(r => r.json()).then(s => setTtsVoice(s.tts_voice ?? 'anushka'));
  };

  const startEdit = () => {
    if (!campaign) return;
    setEditName(campaign.name);
    setEditQ(campaign.question);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!editName.trim() || !editQ.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), question: editQ.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setCampaign(updated);
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const previewQuestion = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
      setPreviewing(false);
      return;
    }
    setPreviewing(true);
    const audio = new Audio(`/api/tts/${id}?voice_override=${ttsVoice}`);
    audioRef.current = audio;
    audio.onended  = () => { setPreviewing(false); audioRef.current = null; };
    audio.onerror  = () => { setPreviewing(false); audioRef.current = null; };
    audio.play().catch(() => { setPreviewing(false); audioRef.current = null; });
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

  if (!campaign) return <div className="text-gray-400 animate-pulse">Loading…</div>;

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {campaign.provider === 'exotel' ? 'Model EX' : 'Model VO'}
            {' · '}STT: {campaign.stt_enabled ? 'On' : 'Off'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={deleteCampaign}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete campaign"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Edit Form ── */}
      {editing && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-indigo-800">Edit Campaign</h3>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Campaign Name</label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Question (spoken via TTS)</label>
            <textarea
              value={editQ}
              onChange={e => setEditQ(e.target.value)}
              rows={3}
              className="w-full rounded-lg border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
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
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-white transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Question + Preview ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Question</h3>
          <button
            onClick={previewQuestion}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              previewing
                ? 'bg-indigo-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {previewing ? (
              <><Square className="w-3.5 h-3.5 fill-current" /> Stop</>
            ) : (
              <><Play className="w-3.5 h-3.5 fill-current" /> Preview</>
            )}
          </button>
        </div>
        <p className="text-gray-800 text-sm leading-relaxed">{campaign.question}</p>
        {previewing && (
          <p className="text-xs text-indigo-500 animate-pulse">Playing in selected voice…</p>
        )}
      </div>

      {/* ── Voice Selector ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">TTS Voice</h3>
        <VoiceSelector
          initial={ttsVoice}
          campaignId={id}
        />
      </div>

      {/* ── Contacts ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Contacts ({contacts.length})
        </h3>
        {contacts.length === 0 ? (
          <p className="text-gray-400 text-sm">No contacts added</p>
        ) : (
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {contacts.map(c => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-gray-700">{c.phone}</span>
                {c.name && <span className="text-gray-400">({c.name})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Errors / Success ── */}
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {triggerResult && (
        <div className="bg-green-50 text-green-800 border border-green-200 rounded-lg px-4 py-3 text-sm">
          Triggered {triggerResult.triggered} calls.{' '}
          <a href="/results" className="underline font-medium">View Results →</a>
        </div>
      )}

      {/* ── Trigger Button ── */}
      <button
        onClick={trigger}
        disabled={triggering || contacts.length === 0}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        <Phone className="w-4 h-4" />
        {triggering ? 'Calling…' : `Start Calling (${contacts.length} contacts)`}
      </button>
    </div>
  );
}
