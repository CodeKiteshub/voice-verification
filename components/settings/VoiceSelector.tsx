'use client';
import { useState, useRef } from 'react';
import { Play, Square } from 'lucide-react';

export const VOICES = [
  { id: 'anushka',  name: 'Anushka',  gender: 'F' },
  { id: 'meera',    name: 'Meera',    gender: 'F' },
  { id: 'pavithra', name: 'Pavithra', gender: 'F' },
  { id: 'maitreyi', name: 'Maitreyi', gender: 'F' },
  { id: 'diya',     name: 'Diya',     gender: 'F' },
  { id: 'karan',    name: 'Karan',    gender: 'M' },
  { id: 'arvind',   name: 'Arvind',   gender: 'M' },
  { id: 'amol',     name: 'Amol',     gender: 'M' },
  { id: 'arjun',    name: 'Arjun',    gender: 'M' },
];

interface Props {
  initial: string;
  /** If provided, ▶ plays the campaign's actual question TTS instead of the generic sample */
  campaignId?: string;
}

export function VoiceSelector({ initial, campaignId }: Props) {
  const [selected, setSelected] = useState(initial);
  const [playing, setPlaying]   = useState<string | null>(null);
  const [loading, setLoading]   = useState<string | null>(null);
  const [saving,  setSaving]    = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlaying(null);
    setLoading(null);
  };

  const preview = (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    stopAudio();
    if (playing === voiceId) return;          // second click = stop (already stopped above)

    const src = campaignId
      ? `/api/tts/${campaignId}?voice_override=${voiceId}`
      : `/api/tts/preview?voice=${voiceId}`;

    setLoading(voiceId);
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.oncanplaythrough = () => { setLoading(null); setPlaying(voiceId); };
    audio.onended  = () => setPlaying(null);
    audio.onerror  = () => { setLoading(null); setPlaying(null); };
    audio.play().catch(() => { setLoading(null); setPlaying(null); });
  };

  const select = async (voiceId: string) => {
    setSelected(voiceId);
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tts_voice: voiceId }),
    });
    setSaving(false);
  };

  const females = VOICES.filter(v => v.gender === 'F');
  const males   = VOICES.filter(v => v.gender === 'M');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Press <span className="font-medium">▶</span> to hear{' '}
          {campaignId ? 'your question' : 'a sample'} · click a card to use that voice
        </p>
        {saving && <span className="text-xs text-indigo-500 animate-pulse">Saving…</span>}
      </div>

      {[{ label: 'Female', voices: females }, { label: 'Male', voices: males }].map(group => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            {group.label}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {group.voices.map(v => {
              const isSel  = selected === v.id;
              const isPly  = playing  === v.id;
              const isLd   = loading  === v.id;

              return (
                <div
                  key={v.id}
                  onClick={() => select(v.id)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-all select-none ${
                    isSel
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-400'
                      : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSel ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {v.name}
                    </p>
                    {isSel && <p className="text-xs text-indigo-500">Active</p>}
                  </div>

                  <button
                    onClick={e => preview(v.id, e)}
                    title={isPly ? 'Stop' : 'Preview'}
                    className={`ml-1.5 shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                      isPly ? 'bg-indigo-600 text-white'
                      : isLd ? 'bg-gray-100 text-gray-400'
                      : 'text-gray-400 hover:bg-indigo-100 hover:text-indigo-600'
                    }`}
                  >
                    {isLd ? (
                      <span className="w-3 h-3 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin block" />
                    ) : isPly ? (
                      <Square className="w-3 h-3 fill-current" />
                    ) : (
                      <Play className="w-3 h-3 fill-current" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
