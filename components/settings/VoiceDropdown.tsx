'use client';
import { useState, useRef } from 'react';
import { Play, Square } from 'lucide-react';

export const VOICES = [
  { id: 'anushka',  label: 'Anushka  — Female' },
  { id: 'manisha',  label: 'Manisha  — Female' },
  { id: 'vidya',    label: 'Vidya    — Female' },
  { id: 'arya',     label: 'Arya     — Female' },
  { id: 'abhilash', label: 'Abhilash — Male'   },
  { id: 'karun',    label: 'Karun    — Male'   },
  { id: 'hitesh',   label: 'Hitesh   — Male'   },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Question text — preview speaks this instead of the generic sample when provided */
  previewText?: string;
}

export function VoiceDropdown({ value, onChange, previewText }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setStatus('idle');
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    stopAudio();
    onChange(e.target.value);
  };

  const togglePreview = async () => {
    // Second click = stop
    if (status !== 'idle') {
      stopAudio();
      return;
    }

    setStatus('loading');

    try {
      const text = previewText?.trim();
      const url  = text
        ? `/api/tts/preview?voice=${value}&text=${encodeURIComponent(text)}`
        : `/api/tts/preview?voice=${value}`;

      // Download the full audio first, then play from a blob URL.
      // This avoids Content-Length / buffering issues with the Audio element.
      const res = await fetch(url);
      if (!res.ok) throw new Error(`TTS failed: ${res.status}`);

      const blob    = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;

      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      audio.onended = stopAudio;
      audio.onerror = () => {
        console.error('[VoicePreview] audio error');
        stopAudio();
      };

      await audio.play();
      setStatus('playing');
    } catch (err) {
      console.error('[VoicePreview] error:', err);
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
        disabled={false /* never disable — second click stops */}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all whitespace-nowrap ${
          status === 'playing'
            ? 'bg-indigo-600 border-indigo-600 text-white'
            : status === 'loading'
            ? 'border-indigo-300 text-indigo-400 bg-indigo-50 cursor-wait'
            : 'border-gray-300 text-gray-600 bg-white hover:border-indigo-400 hover:text-indigo-600'
        }`}
      >
        {status === 'loading' ? (
          <>
            <span className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            Loading…
          </>
        ) : status === 'playing' ? (
          <><Square className="w-3 h-3 fill-current" /> Stop</>
        ) : (
          <><Play className="w-3 h-3 fill-current" /> Preview</>
        )}
      </button>
    </div>
  );
}
