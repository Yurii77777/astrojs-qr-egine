import type { AnalyzerResult, Mode } from './types';
import { ALPHANUM_INDEX, EC_TABLE, MODE_INDICATOR, getCharCountBits } from './tables';

const textEncoder = new TextEncoder();

class BitBuffer {
  private buffer: number[] = [];
  private length = 0;

  put(value: number, numBits: number): void {
    for (let i = numBits - 1; i >= 0; i--) {
      this.buffer.push((value >>> i) & 1);
      this.length++;
    }
  }

  getLength(): number {
    return this.length;
  }

  toBytes(): Uint8Array {
    const byteCount = Math.ceil(this.length / 8);
    const result = new Uint8Array(byteCount);
    for (let i = 0; i < this.length; i++) {
      if (this.buffer[i]) {
        result[i >>> 3] |= 1 << (7 - (i & 7));
      }
    }
    return result;
  }
}

function hasNonLatin1(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 255) return true;
  }
  return false;
}

function encodeNumericData(buf: BitBuffer, text: string): void {
  let i = 0;
  while (i + 2 < text.length) {
    const group = parseInt(text.substring(i, i + 3), 10);
    buf.put(group, 10);
    i += 3;
  }
  const remaining = text.length - i;
  if (remaining === 2) {
    buf.put(parseInt(text.substring(i, i + 2), 10), 7);
  } else if (remaining === 1) {
    buf.put(parseInt(text.substring(i, i + 1), 10), 4);
  }
}

function encodeAlphanumericData(buf: BitBuffer, text: string): void {
  let i = 0;
  while (i + 1 < text.length) {
    const val = ALPHANUM_INDEX[text[i]] * 45 + ALPHANUM_INDEX[text[i + 1]];
    buf.put(val, 11);
    i += 2;
  }
  if (i < text.length) {
    buf.put(ALPHANUM_INDEX[text[i]], 6);
  }
}

function encodeByteData(buf: BitBuffer, text: string): void {
  const bytes = textEncoder.encode(text);
  for (const b of bytes) {
    buf.put(b, 8);
  }
}

function encodeData(buf: BitBuffer, text: string, mode: Mode): void {
  switch (mode) {
    case 'Numeric':
      encodeNumericData(buf, text);
      break;
    case 'Alphanumeric':
      encodeAlphanumericData(buf, text);
      break;
    case 'Byte':
      encodeByteData(buf, text);
      break;
  }
}

export function encode(analysis: AnalyzerResult): Uint8Array {
  const { text, mode, version, ecLevel } = analysis;
  const totalDataBytes = EC_TABLE[version][ecLevel].totalDataBytes;
  const totalCapacityBits = totalDataBytes * 8;

  const buf = new BitBuffer();

  // ECI header for non-Latin1 byte mode
  const needsECI = mode === 'Byte' && hasNonLatin1(text);
  if (needsECI) {
    buf.put(0b0111, 4); // ECI mode indicator
    buf.put(26, 8); // ECI designator for UTF-8
  }

  // Mode indicator
  buf.put(MODE_INDICATOR[mode], 4);

  // Character count
  const countBits = getCharCountBits(mode, version);
  let charCount: number;
  if (mode === 'Byte') {
    charCount = textEncoder.encode(text).length;
  } else {
    charCount = text.length;
  }
  buf.put(charCount, countBits);

  // Data encoding
  encodeData(buf, text, mode);

  // Terminator (up to 4 zero bits, don't exceed capacity)
  const terminatorBits = Math.min(4, totalCapacityBits - buf.getLength());
  if (terminatorBits > 0) {
    buf.put(0, terminatorBits);
  }

  // Pad to byte boundary
  const padBits = (8 - (buf.getLength() % 8)) % 8;
  if (padBits > 0) {
    buf.put(0, padBits);
  }

  // Pad with 0xEC, 0x11 alternation to fill capacity
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (buf.getLength() < totalCapacityBits) {
    buf.put(padBytes[padIdx], 8);
    padIdx = (padIdx + 1) % 2;
  }

  return buf.toBytes();
}

export { BitBuffer };
