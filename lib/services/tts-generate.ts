const FALLBACK_VOICE = 'anushka';

async function callSarvamTTS(text: string, voice: string): Promise<string | null> {
  const res = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': process.env.SARVAM_API_KEY!,
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: 'en-IN',
      speaker: voice,
      pitch: 0,
      pace: 1.0,
      loudness: 1.5,
      speech_sample_rate: 8000,
      enable_preprocessing: true,
      model: 'bulbul:v2',
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.audios?.[0] ?? null;
}

/**
 * Generate TTS audio via Sarvam. If the requested voice is invalid or fails,
 * automatically retries with the fallback voice ('anushka').
 * Returns the base64 audio string and which voice was actually used.
 */
export async function generateTTS(
  text: string,
  voice: string
): Promise<{ audioBase64: string; usedVoice: string }> {
  // Try requested voice first
  const audio = await callSarvamTTS(text, voice);
  if (audio) return { audioBase64: audio, usedVoice: voice };

  // Fallback to anushka
  if (voice !== FALLBACK_VOICE) {
    const fallback = await callSarvamTTS(text, FALLBACK_VOICE);
    if (fallback) return { audioBase64: fallback, usedVoice: FALLBACK_VOICE };
  }

  throw new Error(`Sarvam TTS failed for both "${voice}" and fallback "${FALLBACK_VOICE}"`);
}
