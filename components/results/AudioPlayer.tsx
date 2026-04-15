'use client';
import type { CallRecord } from '@/lib/types';

export function AudioPlayer({ call }: { call: CallRecord }) {
  if (!call.recording_url) {
    return <p className="text-sm text-gray-400 italic">Recording not available</p>;
  }

  const src = call.recording_proxied
    ? `/api/calls/${call.id}/recording-proxy`
    : call.recording_url;

  return (
    <audio controls src={src} className="w-full h-10" preload="none">
      Your browser does not support audio playback.
    </audio>
  );
}
