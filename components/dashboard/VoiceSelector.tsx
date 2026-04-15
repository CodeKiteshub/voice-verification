'use client';
import { useState, useRef } from 'react';
import { Play, Square, Check } from 'lucide-react';

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

export function VoiceSelector({ initial }: { initial: string }) {
  const [selected, setSelected] = useState(initial);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const preview = async (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if (playing === voiceId) {
      setPlaying(null);
      return;
    }

    setLoading(voiceId);
    const audio = new Audio(`/api/tts/preview?voice=${voiceId}`);
    audioRef.current = audio;

    audio.oncanplaythrough = () => {
      setLoading(null);
      setPlaying(voiceId);
    };
    audio.onended = () => setPlaying(null);
    audio.onerror = () => { setLoading(null); setPlaying(null); };
    audio.load();
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
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">TTS Voice</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Click ▶ to preview · click a card to select for all calls
          </p>
        </div>
        {saving && (
          <span className="text-xs text-indigo-500 animate-pulse">Saving…</span>
        )}
      </div>

      <div className="space-y-3">
        {[{ label: 'Female', voices: females }, { label: 'Male', voices: males }].map(group => (
          <div key={group.label}>
            <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              {group.label}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {group.voices.map(v => {
                const isSelected = selected === v.id;
                const isPlaying  = playing  === v.id;
                const isLoading  = loading  === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => select(v.id)}
                    className={`relative flex items-center justify-between rounded-lg border px-3 py-2.5 cursor-pointer transition-all select-none ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-400'
                        : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                        {v.name}
                      </p>
                      {isSelected && (
                        <p className="text-xs text-indigo-500 font-medium">Active</p>
                      )}
                    </div>

                    <button
                      onClick={(e) => preview(v.id, e)}
                      title={isPlaying ? 'Stop' : 'Preview voice'}
                      className={`ml-2 shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                        isPlaying
                          ? 'bg-indigo-600 text-white'
                          : isLoading
                          ? 'bg-gray-100 text-gray-400'
                          : 'text-gray-400 hover:bg-indigo-100 hover:text-indigo-600'
                      }`}
                    >
                      {isLoading ? (
                        <span className="w-3 h-3 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                      ) : isPlaying ? (
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
    </div>
  );
}
