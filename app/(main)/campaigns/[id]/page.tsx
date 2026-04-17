'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { AgentConfig, Campaign, Contact } from '@/lib/types';
import { Phone, Trash2, Pencil, X, Check, Clock, AlertCircle } from 'lucide-react';
import { VoiceDropdown, VOICES } from '@/components/settings/VoiceDropdown';
import { AgentConfigForm } from '@/components/campaigns/AgentConfigForm';

function voiceLabel(id: string) {
  return VOICES.find(v => v.id === id)?.label ?? id;
}

const TYPE_LABELS: Record<string, string> = {
  verification: 'Verification',
  'agent-vapi': 'AI Agent · VAPI',
  'agent-pipecat': 'AI Agent · Pipecat',
};

export default function CampaignDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [campaign,       setCampaign]       = useState<Campaign | null>(null);
  const [contacts,       setContacts]       = useState<Contact[]>([]);
  const [triggering,     setTriggering]     = useState(false);
  const [triggerResult,  setTriggerResult]  = useState<string | null>(null);
  const [error,          setError]          = useState('');

  // Edit state
  const [editing,      setEditing]      = useState(false);
  const [editName,     setEditName]     = useState('');
  const [editQ,        setEditQ]        = useState('');
  const [editVoice,    setEditVoice]    = useState('anushka');
  const [editAConfig,  setEditAConfig]  = useState<AgentConfig | null>(null);
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/campaigns/${id}`).then(r => r.json()),
      fetch(`/api/campaigns/${id}/contacts`).then(r => r.json()),
    ]).then(([c, ct]) => {
      setCampaign(c);
      setContacts(ct);
    });
  }, [id]);

  const isAgent = campaign?.campaign_type?.startsWith('agent-') ?? false;

  const startEdit = () => {
    if (!campaign) return;
    setEditName(campaign.name);
    setEditQ(campaign.question ?? '');
    setEditVoice(campaign.tts_voice ?? 'anushka');
    setEditAConfig(campaign.agent_config ?? null);
    setEditing(true);
    setError('');
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!editName.trim()) { setError('Name is required'); return; }
    if (!isAgent && !editQ.trim()) { setError('Question is required'); return; }
    setSaving(true);
    setError('');
    try {
      const patchBody: Record<string, unknown> = { name: editName.trim() };
      if (isAgent && editAConfig) {
        patchBody.agent_config = editAConfig;
      } else {
        patchBody.question = editQ.trim();
        patchBody.tts_voice = editVoice;
      }
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
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
    setTriggerResult(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/trigger`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Trigger failed');
      setTriggerResult(data.message ?? `Triggered ${data.count ?? contacts.length} calls`);
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

  const vapiPending = campaign.campaign_type === 'agent-vapi' && campaign.vapi_status !== 'provisioned';

  return (
    <div className="max-w-2xl space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900 truncate">{campaign.name}</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {TYPE_LABELS[campaign.campaign_type ?? 'verification'] ?? campaign.campaign_type}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
            <span>{campaign.provider === 'exotel' ? 'Model EX' : 'Model VO'}</span>
            {!isAgent && (
              <>
                <span>·</span>
                <span>Voice: {voiceLabel(campaign.tts_voice ?? 'anushka').split('—')[0].trim()}</span>
                <span>·</span>
                <span>STT: {campaign.stt_enabled ? 'On' : 'Off'}</span>
              </>
            )}
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

      {/* ── VAPI provisioning status banner ── */}
      {campaign.campaign_type === 'agent-vapi' && (
        <>
          {campaign.vapi_status === 'pending' && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              <Clock className="w-4 h-4 shrink-0" />
              Provisioning VAPI assistant… This usually takes a few seconds. Refresh to check.
            </div>
          )}
          {campaign.vapi_status === 'failed' && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              VAPI assistant provisioning failed. Check Admin → Settings for VAPI credentials, then delete and recreate this campaign.
            </div>
          )}
        </>
      )}

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

          {/* Agent config or verification question */}
          {isAgent && editAConfig ? (
            <AgentConfigForm value={editAConfig} onChange={setEditAConfig} />
          ) : (
            <>
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
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

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

      {/* ── Campaign details (read-only) ── */}
      {!editing && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          {isAgent && campaign.agent_config ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Company</p>
                  <p className="text-gray-800">{campaign.agent_config.company_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Role</p>
                  <p className="text-gray-800">{campaign.agent_config.agent_role}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Questions ({campaign.agent_config.questions.length})</p>
                <ol className="list-decimal list-inside space-y-1">
                  {campaign.agent_config.questions
                    .sort((a, b) => a.order - b.order)
                    .map(q => (
                      <li key={q.id} className="text-sm text-gray-700">{q.text}</li>
                    ))}
                </ol>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Question</p>
              <p className="text-gray-800 text-sm leading-relaxed">{campaign.question}</p>
            </>
          )}
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
          ✓ {triggerResult}.{' '}
          <a href="/results" className="underline font-medium">View Results →</a>
        </div>
      )}

      {/* ── Trigger button ── */}
      <button
        onClick={trigger}
        disabled={triggering || contacts.length === 0 || vapiPending}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
        title={vapiPending ? 'VAPI assistant is still being provisioned' : undefined}
      >
        <Phone className="w-4 h-4" />
        {triggering
          ? 'Dialling…'
          : vapiPending
          ? 'Awaiting provisioning…'
          : `Start Calling (${contacts.length} contact${contacts.length !== 1 ? 's' : ''})`}
      </button>
    </div>
  );
}
