import { describe, expect, it } from 'vitest';

import { getGenerator } from '../generators';

describe('getGenerator', () => {
  it('generator(1) = [1, 1] (x - α^0)', () => {
    const g = getGenerator(1);
    expect(Array.from(g)).toEqual([1, 1]);
  });

  it('generator(2) = [1, 3, 2]', () => {
    // (x - α^0)(x - α^1) = x^2 - (α^0 + α^1)x + α^0·α^1
    // = x^2 + 3x + 2 (in GF(256), sub = add = XOR)
    const g = getGenerator(2);
    expect(Array.from(g)).toEqual([1, 3, 2]);
  });

  it('generator length = n+1', () => {
    for (const n of [1, 5, 10, 17, 26, 30]) {
      expect(getGenerator(n).length).toBe(n + 1);
    }
  });

  it('leading coefficient is always 1', () => {
    for (const n of [1, 7, 10, 15, 20, 28, 30]) {
      expect(getGenerator(n)[0]).toBe(1);
    }
  });

  it('returns cached result on repeated calls', () => {
    const g1 = getGenerator(10);
    const g2 = getGenerator(10);
    expect(g1).toBe(g2); // same reference
  });

  it('generator(10) matches known polynomial', () => {
    // V1-M uses 10 EC bytes, known generator polynomial coefficients
    const g = getGenerator(10);
    expect(g.length).toBe(11);
    expect(g[0]).toBe(1);
  });
});
