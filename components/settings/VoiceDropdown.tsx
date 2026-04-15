'use client';
import { useState, useRef } from 'react';
import { Play, Square } from 'lucide-react';

export const VOICES = [
  { id: 'anushka',  label: 'Anushka  — Female' },
  { id: 'meera',    label: 'Meera    — Female' },
  { id: 'pavithra', label: 'Pavithra — Female' },
  { id: 'maitreyi', label: 'Maitreyi — Female' },
  { id: 'diya',     label: 'Diya     — Female' },
  { id: 'karan',    label: 'Karan    — Male'   },
  { id: 'arvind',   label: 'Arvind   — Male'   },
  { id: 'amol',     label: 'Amol     — Male'   },
  { id: 'arjun',    label: 'Arjun    — Male'   },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Question text — if provided the preview speaks this instead of the generic sample */
  previewText?: string;
}

export function VoiceDropdown({ value, onChange, previewText }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setStatus('idle');
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    stopAudio();
    onChange(e.target.value);
  };

  const togglePreview = async () => {
    if (status !== 'idle') { stopAudio(); return; }

    const text = previewText?.trim();
    const url  = text
      ? `/api/tts/preview?voice=${value}&text=${encodeURIComponent(text)}`
      : `/api/tts/preview?voice=${value}`;

    setStatus('loading');
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = stopAudio;
    audio.onerror = stopAudio;

    try {
      // play() returns a Promise that resolves when audio actually starts
      await audio.play();
      setStatus('playing');
    } catch {
      stopAudio();
    }
  };

  return (
    <div className="flex gap-2 items-stretch">
      <select
        value={value}
        onChange={handleVoiceChange}
        className="flex-1 rounded-lg border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      >
        {VOICES.map(v => (
          <option key={v.id} value={v.id}>{v.label}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={togglePreview}
        disabled={status === 'loading'}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap ${
          status === 'playing'
            ? 'bg-indigo-600 border-indigo-600 text-white'
            : status === 'loading'
            ? 'border-gray-200 text-gray-400 cursor-wait bg-gray-50'
            : 'border-gray-300 text-gray-600 bg-white hover:border-indigo-400 hover:text-indigo-600'
        }`}
      >
        {status === 'loading' ? (
          <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
        ) : status === 'playing' ? (
          <><Square className="w-3 h-3 fill-current" /> Stop</>
        ) : (
          <><Play className="w-3 h-3 fill-current" /> Preview</>
        )}
      </button>
    </div>
  );
}
