import { describe, expect, it } from 'vitest';

import { rsEncode } from '../rs';

describe('rsEncode', () => {
  it('V1-M "HELLO WORLD" reference test', () => {
    // Data codewords for "HELLO WORLD" at V1-M (16 data bytes, 10 EC)
    const data = new Uint8Array([
      32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17,
    ]);
    const ec = rsEncode(data, 10);
    expect(Array.from(ec)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  it('returns correct number of EC codewords', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const ec = rsEncode(data, 7);
    expect(ec.length).toBe(7);
  });

  it('all-zero data produces all-zero EC', () => {
    const data = new Uint8Array(10);
    const ec = rsEncode(data, 5);
    expect(Array.from(ec)).toEqual([0, 0, 0, 0, 0]);
  });

  it('single byte data with 1 EC codeword', () => {
    const data = new Uint8Array([42]);
    const ec = rsEncode(data, 1);
    // Generator for n=1 is [1, 1], so EC = data[0] XOR (data[0] * 1) remainder
    // Actually for polynomial division: buf = [42, 0]
    // step 0: coef=42, buf[0] ^= 42*1=42 → 0, buf[1] ^= 42*1=42
    // result = [42]
    expect(ec.length).toBe(1);
    expect(ec[0]).toBe(42);
  });
});
