/**
 * Mixes subtle pink noise into a 16-bit PCM WAV buffer.
 * Makes TTS audio feel like a real phone call (office ambient).
 * Only touches audio data; WAV header is preserved untouched.
 */
export function addSubtleNoise(wavBuffer: Buffer, levelPercent = 2): Buffer {
  const HEADER_SIZE = 44;
  if (wavBuffer.length <= HEADER_SIZE) return wavBuffer;

  const header = wavBuffer.slice(0, HEADER_SIZE);
  const pcm = Buffer.from(wavBuffer.slice(HEADER_SIZE)); // copy so we don't mutate

  // Pink noise state (Paul Kellett's algorithm — more natural than white noise)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  const level = 32767 * (levelPercent / 100);

  for (let i = 0; i < pcm.length - 1; i += 2) {
    const sample = pcm.readInt16LE(i);

    // Pink noise approximation
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    b6 = white * 0.115926;
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;

    const noisy = Math.max(-32768, Math.min(32767, Math.round(sample + pink * level)));
    pcm.writeInt16LE(noisy, i);
  }

  return Buffer.concat([header, pcm]);
}
