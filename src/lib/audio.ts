// Voice-memo helpers for Quick Capture.
// Browsers record in different containers (webm on Chrome/Firefox, mp4 on Safari), and
// Gemini does not reliably accept all of them. So the recording is decoded and re-encoded
// as 16 kHz mono 16-bit WAV, which every browser can produce and Gemini always understands.

export const MAX_RECORD_SECONDS = 90; // 90 s of 16 kHz mono WAV is ~2.9 MB (~3.8 MB base64), under Vercel's 4.5 MB body limit
export const MAX_AUDIO_BASE64 = 4_000_000;

export interface AudioPayload {
  mimeType: string;
  data: string; // base64
}

export function canRecord(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}

export function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) =>
    MediaRecorder.isTypeSupported(m)
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

async function blobToWav(blob: Blob): Promise<AudioPayload> {
  const Ctx: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const target = 16000;
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * target)), target);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination); // multi-channel input is down-mixed to mono
    src.start();
    const rendered = await offline.startRendering();
    return { mimeType: 'audio/wav', data: bytesToBase64(encodeWav(rendered.getChannelData(0), target)) };
  } finally {
    ctx.close().catch(() => {});
  }
}

function blobToRawBase64(blob: Blob): Promise<AudioPayload> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const url = String(r.result || '');
      resolve({ mimeType: (blob.type || 'audio/webm').split(';')[0], data: url.split(',')[1] || '' });
    };
    r.onerror = () => reject(new Error('تعذّرت قراءة التسجيل'));
    r.readAsDataURL(blob);
  });
}

/** Converts a recording to WAV; falls back to the raw recording if the browser can't decode it. */
export async function blobToAudioPayload(blob: Blob): Promise<AudioPayload> {
  let payload: AudioPayload;
  try {
    payload = await blobToWav(blob);
  } catch {
    payload = await blobToRawBase64(blob);
  }
  if (!payload.data) throw new Error('التسجيل فاضي، جرّب تاني.');
  if (payload.data.length > MAX_AUDIO_BASE64) {
    throw new Error('الفويس طويل زيادة، سجّل أقل من دقيقة ونص.');
  }
  return payload;
}
