import { describe, expect, it } from 'vitest';

import { EXP, LOG, gfAdd, gfDiv, gfMul, gfPow } from '../gf256';

describe('GF(256)', () => {
  it('EXP[0] = 1 (α^0 = 1)', () => {
    expect(EXP[0]).toBe(1);
  });

  it('EXP[255] = EXP[0] = 1 (field cycle)', () => {
    expect(EXP[255]).toBe(EXP[0]);
    expect(EXP[255]).toBe(1);
  });

  it('LOG[1] = 0', () => {
    expect(LOG[1]).toBe(0);
  });

  it('EXP[LOG[x]] = x for all x in 1..255', () => {
    for (let x = 1; x < 256; x++) {
      expect(EXP[LOG[x]]).toBe(x);
    }
  });

  it('EXP table duplicated correctly (index 255..511)', () => {
    for (let i = 0; i < 255; i++) {
      expect(EXP[i + 255]).toBe(EXP[i]);
    }
  });

  it('gfMul(0, x) = 0 for any x', () => {
    expect(gfMul(0, 0)).toBe(0);
    expect(gfMul(0, 1)).toBe(0);
    expect(gfMul(0, 255)).toBe(0);
    expect(gfMul(137, 0)).toBe(0);
  });

  it('gfMul(1, x) = x (multiplicative identity)', () => {
    for (let x = 0; x < 256; x++) {
      expect(gfMul(1, x)).toBe(x);
    }
  });

  it('gfMul is commutative', () => {
    expect(gfMul(5, 7)).toBe(gfMul(7, 5));
    expect(gfMul(100, 200)).toBe(gfMul(200, 100));
  });

  it('gfMul known values', () => {
    // α^1 * α^1 = α^2 = EXP[2]
    expect(gfMul(EXP[1], EXP[1])).toBe(EXP[2]);
    // α^127 * α^127 = α^254
    expect(gfMul(EXP[127], EXP[127])).toBe(EXP[254]);
  });

  it('gfAdd is XOR', () => {
    expect(gfAdd(0, 0)).toBe(0);
    expect(gfAdd(0, 5)).toBe(5);
    expect(gfAdd(5, 5)).toBe(0);
    expect(gfAdd(0b1010, 0b0110)).toBe(0b1100);
  });

  it('gfPow basic cases', () => {
    expect(gfPow(2, 0)).toBe(1);
    expect(gfPow(0, 5)).toBe(0);
    expect(gfPow(EXP[1], 3)).toBe(EXP[3]);
  });

  it('gfDiv reverses gfMul', () => {
    const a = 42;
    const b = 137;
    const product = gfMul(a, b);
    expect(gfDiv(product, b)).toBe(a);
    expect(gfDiv(product, a)).toBe(b);
  });

  it('gfDiv(0, x) = 0', () => {
    expect(gfDiv(0, 7)).toBe(0);
  });

  it('gfDiv by zero throws', () => {
    expect(() => gfDiv(5, 0)).toThrow('Division by zero');
  });

  it('all 255 non-zero elements are unique in EXP[0..254]', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 255; i++) {
      seen.add(EXP[i]);
    }
    expect(seen.size).toBe(255);
    expect(seen.has(0)).toBe(false);
  });
});
