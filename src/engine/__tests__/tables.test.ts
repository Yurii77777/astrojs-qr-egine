import { describe, expect, it } from 'vitest';

import type { ECLevel } from '../types';
import {
  ALIGNMENT_COORDS,
  ALPHANUM_CHARSET,
  ALPHANUM_INDEX,
  EC_TABLE,
  MODE_INDICATOR,
  SIZE_CLASS_RANGE,
  getCharCountBits,
  getRemainderBits,
} from '../tables';

describe('EC_TABLE', () => {
  it('has entries for versions 1-40', () => {
    for (let v = 1; v <= 40; v++) {
      expect(EC_TABLE[v]).toBeDefined();
      for (const ec of ['L', 'M', 'Q', 'H'] as ECLevel[]) {
        expect(EC_TABLE[v][ec]).toBeDefined();
      }
    }
  });

  it('totalDataBytes = sum of group data bytes for all 160 entries', () => {
    for (let v = 1; v <= 40; v++) {
      for (const ec of ['L', 'M', 'Q', 'H'] as ECLevel[]) {
        const entry = EC_TABLE[v][ec];
        const g1Total = entry.group1.count * entry.group1.dataBytes;
        const g2Total = entry.group2 ? entry.group2.count * entry.group2.dataBytes : 0;
        expect(g1Total + g2Total).toBe(entry.totalDataBytes);
      }
    }
  });

  it('V1-M has correct values', () => {
    const v1m = EC_TABLE[1].M;
    expect(v1m.totalDataBytes).toBe(16);
    expect(v1m.group1.count).toBe(1);
    expect(v1m.group1.dataBytes).toBe(16);
    expect(v1m.group1.ecBytes).toBe(10);
  });

  it('V1-L has 19 data bytes', () => {
    expect(EC_TABLE[1].L.totalDataBytes).toBe(19);
  });

  it('V5-Q has two groups', () => {
    const v5q = EC_TABLE[5].Q;
    expect(v5q.group1.count).toBe(2);
    expect(v5q.group1.dataBytes).toBe(15);
    expect(v5q.group2).toBeDefined();
    expect(v5q.group2!.count).toBe(2);
    expect(v5q.group2!.dataBytes).toBe(16);
  });

  it('ecBytes is same for group1 and group2', () => {
    for (let v = 1; v <= 40; v++) {
      for (const ec of ['L', 'M', 'Q', 'H'] as ECLevel[]) {
        const entry = EC_TABLE[v][ec];
        if (entry.group2) {
          expect(entry.group2.ecBytes).toBe(entry.group1.ecBytes);
        }
      }
    }
  });

  it('totalDataBytes increases with L > M > Q > H', () => {
    for (let v = 1; v <= 40; v++) {
      expect(EC_TABLE[v].L.totalDataBytes).toBeGreaterThan(EC_TABLE[v].M.totalDataBytes);
      expect(EC_TABLE[v].M.totalDataBytes).toBeGreaterThan(EC_TABLE[v].Q.totalDataBytes);
      expect(EC_TABLE[v].Q.totalDataBytes).toBeGreaterThan(EC_TABLE[v].H.totalDataBytes);
    }
  });
});

describe('ALIGNMENT_COORDS', () => {
  it('has no entry for version 1', () => {
    expect(ALIGNMENT_COORDS[1]).toBeUndefined();
  });

  it('has entries for versions 2-40', () => {
    for (let v = 2; v <= 40; v++) {
      expect(ALIGNMENT_COORDS[v]).toBeDefined();
      expect(ALIGNMENT_COORDS[v].length).toBeGreaterThanOrEqual(2);
    }
  });

  it('first coord is always 6', () => {
    for (let v = 2; v <= 40; v++) {
      expect(ALIGNMENT_COORDS[v][0]).toBe(6);
    }
  });

  it('last coord equals size-7 (= 4*v+10-7 = 4*v+3)', () => {
    // Actually the last alignment center should be at size-7 = 4v+17-7 = 4v+10
    // size = 4v+17, last coord = size-7 = 4v+10
    for (let v = 2; v <= 40; v++) {
      const lastCoord = ALIGNMENT_COORDS[v][ALIGNMENT_COORDS[v].length - 1];
      expect(lastCoord).toBe(4 * v + 10);
    }
  });
});

describe('getCharCountBits', () => {
  it('Byte mode: 8 bits for v1-9, 16 for v10+', () => {
    expect(getCharCountBits('Byte', 1)).toBe(8);
    expect(getCharCountBits('Byte', 9)).toBe(8);
    expect(getCharCountBits('Byte', 10)).toBe(16);
    expect(getCharCountBits('Byte', 26)).toBe(16);
    expect(getCharCountBits('Byte', 27)).toBe(16);
    expect(getCharCountBits('Byte', 40)).toBe(16);
  });

  it('Numeric mode: 10/12/14 bits', () => {
    expect(getCharCountBits('Numeric', 1)).toBe(10);
    expect(getCharCountBits('Numeric', 9)).toBe(10);
    expect(getCharCountBits('Numeric', 10)).toBe(12);
    expect(getCharCountBits('Numeric', 26)).toBe(12);
    expect(getCharCountBits('Numeric', 27)).toBe(14);
  });

  it('Alphanumeric mode: 9/11/13 bits', () => {
    expect(getCharCountBits('Alphanumeric', 1)).toBe(9);
    expect(getCharCountBits('Alphanumeric', 9)).toBe(9);
    expect(getCharCountBits('Alphanumeric', 10)).toBe(11);
    expect(getCharCountBits('Alphanumeric', 27)).toBe(13);
  });
});

describe('ALPHANUM_CHARSET', () => {
  it('has 45 characters', () => {
    expect(ALPHANUM_CHARSET.length).toBe(45);
  });

  it('ALPHANUM_INDEX maps all 45 chars', () => {
    expect(Object.keys(ALPHANUM_INDEX).length).toBe(45);
    for (let i = 0; i < 45; i++) {
      expect(ALPHANUM_INDEX[ALPHANUM_CHARSET[i]]).toBe(i);
    }
  });

  it('contains only uppercase letters', () => {
    expect(ALPHANUM_CHARSET).not.toMatch(/[a-z]/);
  });
});

describe('MODE_INDICATOR', () => {
  it('Numeric = 0001', () => {
    expect(MODE_INDICATOR.Numeric).toBe(0b0001);
  });

  it('Alphanumeric = 0010', () => {
    expect(MODE_INDICATOR.Alphanumeric).toBe(0b0010);
  });

  it('Byte = 0100', () => {
    expect(MODE_INDICATOR.Byte).toBe(0b0100);
  });
});

describe('SIZE_CLASS_RANGE', () => {
  it('S covers v1-5', () => {
    expect(SIZE_CLASS_RANGE.S).toEqual([1, 5]);
  });

  it('M covers v6-15', () => {
    expect(SIZE_CLASS_RANGE.M).toEqual([6, 15]);
  });

  it('L covers v16-25', () => {
    expect(SIZE_CLASS_RANGE.L).toEqual([16, 25]);
  });
});

describe('getRemainderBits', () => {
  it('version 1 = 0', () => {
    expect(getRemainderBits(1)).toBe(0);
  });

  it('versions 2-6 = 7', () => {
    for (let v = 2; v <= 6; v++) {
      expect(getRemainderBits(v)).toBe(7);
    }
  });

  it('version 21 = 4', () => {
    expect(getRemainderBits(21)).toBe(4);
  });
});
