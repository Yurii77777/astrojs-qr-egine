import { describe, expect, it } from 'vitest';

import { interleave } from '../interleaver';

describe('interleave', () => {
  it('V1-M single block passes through unchanged + appends EC', () => {
    // V1-M: 1 block, 16 data bytes, 10 EC bytes, 0 remainder bits
    const data = new Uint8Array([
      32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17,
    ]);
    const bits = interleave(data, 1, 'M');

    // Total: (16 + 10) * 8 = 208 bits, no remainder for V1
    expect(bits.length).toBe(208);

    // First 128 bits should encode the 16 data bytes
    const firstDataByte = bitsToBytes(bits.slice(0, 8));
    expect(firstDataByte).toBe(32);

    // With single block, data goes through unchanged
    for (let i = 0; i < 16; i++) {
      expect(bitsToBytes(bits.slice(i * 8, i * 8 + 8))).toBe(data[i]);
    }
  });

  it('V5-Q multi-group interleaves correctly', () => {
    // V5-Q: group1: 2 blocks × 15 data bytes, group2: 2 blocks × 16 data bytes
    // ecBytes = 18, total data = 62 bytes
    const data = new Uint8Array(62);
    for (let i = 0; i < 62; i++) data[i] = i + 1;

    const bits = interleave(data, 5, 'Q');

    // Total codewords: 62 data + 4*18 EC = 62 + 72 = 134 bytes
    // Remainder bits for V5 = 7
    // Total bits = 134*8 + 7 = 1079
    expect(bits.length).toBe(1079);

    // Verify interleaving: first data column should take byte 0 from each block
    // Block 0: data[0..14], Block 1: data[15..29], Block 2: data[30..45], Block 3: data[46..61]
    const firstFourBytes = [
      bitsToBytes(bits.slice(0, 8)),
      bitsToBytes(bits.slice(8, 16)),
      bitsToBytes(bits.slice(16, 24)),
      bitsToBytes(bits.slice(24, 32)),
    ];
    expect(firstFourBytes).toEqual([1, 16, 31, 47]); // first byte of each block
  });

  it('includes remainder bits', () => {
    // V2-M: 1 block, 28 data bytes, 16 EC bytes
    // Remainder bits for V2 = 7
    const data = new Uint8Array(28);
    const bits = interleave(data, 2, 'M');
    expect(bits.length).toBe((28 + 16) * 8 + 7);

    // Last 7 bits should be 0 (remainder)
    for (let i = bits.length - 7; i < bits.length; i++) {
      expect(bits[i]).toBe(0);
    }
  });
});

function bitsToBytes(bits: Uint8Array): number {
  let val = 0;
  for (const bit of bits) {
    val = (val << 1) | bit;
  }
  return val;
}
