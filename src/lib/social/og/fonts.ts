/**
 * Offline fonts for ImageResponse: Inter Regular + ExtraBold embedded as base64 (see fontData.ts).
 * Nothing is fetched at runtime.
 */

import { INTER_EXTRABOLD_B64, INTER_REGULAR_B64 } from './fontData';

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

let cached: { name: string; data: ArrayBuffer; weight: 400 | 800; style: 'normal' }[] | null = null;

export function ogFonts() {
  if (!cached) {
    cached = [
      { name: 'Inter', data: b64ToArrayBuffer(INTER_REGULAR_B64), weight: 400, style: 'normal' },
      { name: 'Inter', data: b64ToArrayBuffer(INTER_EXTRABOLD_B64), weight: 800, style: 'normal' },
    ];
  }
  return cached;
}
