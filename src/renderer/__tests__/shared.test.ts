import { describe, expect, it } from 'vitest';

import type { QRMatrix } from '@/engine/types';

import type { RenderOptions } from '../types';
import {
  angleToGradientCoords,
  calculateDimensions,
  calculateLogoRect,
  cloneModules,
  excavateLogoZone,
  forEachModule,
  getFinderLayer,
  getFinderPositions,
  isFinderModule,
} from '../shared';

function makeMatrix(size: number, fill: boolean = false): QRMatrix {
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(fill));
  const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  return { size, version: 1, modules, isFunction };
}

function makeOptions(overrides: Partial<RenderOptions> = {}): RenderOptions {
  return {
    matrix: makeMatrix(21),
    moduleStyle: { shape: 'square', color: { type: 'solid', value: '#000000' } },
    finderStyle: {
      outerShape: 'square',
      innerShape: 'square',
      color: { type: 'solid', value: '#000000' },
    },
    background: { type: 'solid', value: '#ffffff' },
    quietZone: 4,
    pixelSize: 10,
    ...overrides,
  };
}

describe('calculateDimensions', () => {
  it('computes correct dimensions for V1 + quietZone 4', () => {
    const dims = calculateDimensions(makeOptions());

    expect(dims.matrixSize).toBe(21);
    expect(dims.quietZoneModules).toBe(4);
    expect(dims.totalModules).toBe(29); // 21 + 2*4
    expect(dims.totalPx).toBe(290); // 29 * 10
    expect(dims.pixelSize).toBe(10);
  });

  it('handles quietZone 0', () => {
    const dims = calculateDimensions(makeOptions({ quietZone: 0 }));

    expect(dims.totalModules).toBe(21);
    expect(dims.totalPx).toBe(210);
  });

  it('handles quietZone 6', () => {
    const dims = calculateDimensions(makeOptions({ quietZone: 6 }));

    expect(dims.totalModules).toBe(33); // 21 + 12
    expect(dims.totalPx).toBe(330);
  });
});

describe('isFinderModule', () => {
  const size = 21; // V1

  it('identifies top-left finder zone (8x8 including separator)', () => {
    expect(isFinderModule(0, 0, size)).toBe(true);
    expect(isFinderModule(7, 7, size)).toBe(true);
    expect(isFinderModule(0, 7, size)).toBe(true);
    expect(isFinderModule(7, 0, size)).toBe(true);
  });

  it('identifies top-right finder zone', () => {
    expect(isFinderModule(0, size - 1, size)).toBe(true);
    expect(isFinderModule(0, size - 8, size)).toBe(true);
    expect(isFinderModule(7, size - 1, size)).toBe(true);
  });

  it('identifies bottom-left finder zone', () => {
    expect(isFinderModule(size - 1, 0, size)).toBe(true);
    expect(isFinderModule(size - 8, 0, size)).toBe(true);
    expect(isFinderModule(size - 1, 7, size)).toBe(true);
  });

  it('returns false for center of matrix', () => {
    expect(isFinderModule(10, 10, size)).toBe(false);
  });

  it('returns false just outside finder zones', () => {
    expect(isFinderModule(8, 0, size)).toBe(false);
    expect(isFinderModule(0, 8, size)).toBe(false);
    expect(isFinderModule(8, 8, size)).toBe(false);
  });

  it('includes separator row/col (index 7)', () => {
    // Separator is at index 7 for top-left
    expect(isFinderModule(7, 3, size)).toBe(true);
    expect(isFinderModule(3, 7, size)).toBe(true);
  });
});

describe('getFinderPositions', () => {
  it('returns 3 finder origins for V1 (size=21)', () => {
    const positions = getFinderPositions(21);

    expect(positions).toHaveLength(3);
    expect(positions[0]).toEqual({ row: 0, col: 0 });
    expect(positions[1]).toEqual({ row: 0, col: 14 }); // 21 - 7
    expect(positions[2]).toEqual({ row: 14, col: 0 });
  });

  it('returns correct positions for V7 (size=45)', () => {
    const positions = getFinderPositions(45);

    expect(positions[1]).toEqual({ row: 0, col: 38 }); // 45 - 7
    expect(positions[2]).toEqual({ row: 38, col: 0 });
  });
});

describe('getFinderLayer', () => {
  it('classifies border as outer', () => {
    expect(getFinderLayer(0, 0)).toBe('outer');
    expect(getFinderLayer(0, 3)).toBe('outer');
    expect(getFinderLayer(6, 6)).toBe('outer');
    expect(getFinderLayer(3, 0)).toBe('outer');
    expect(getFinderLayer(3, 6)).toBe('outer');
  });

  it('classifies ring (white border)', () => {
    expect(getFinderLayer(1, 1)).toBe('ring');
    expect(getFinderLayer(1, 3)).toBe('ring');
    expect(getFinderLayer(5, 5)).toBe('ring');
    expect(getFinderLayer(3, 1)).toBe('ring');
    expect(getFinderLayer(3, 5)).toBe('ring');
  });

  it('classifies inner 3x3 as center', () => {
    expect(getFinderLayer(2, 2)).toBe('center');
    expect(getFinderLayer(3, 3)).toBe('center');
    expect(getFinderLayer(4, 4)).toBe('center');
    expect(getFinderLayer(2, 4)).toBe('center');
    expect(getFinderLayer(4, 2)).toBe('center');
  });
});

describe('cloneModules', () => {
  it('creates a deep copy', () => {
    const original = [
      [true, false],
      [false, true],
    ];
    const clone = cloneModules(original);

    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone[0]).not.toBe(original[0]);
  });

  it('mutations to clone do not affect original', () => {
    const original = [
      [true, false],
      [false, true],
    ];
    const clone = cloneModules(original);

    clone[0][0] = false;
    clone[1][1] = false;

    expect(original[0][0]).toBe(true);
    expect(original[1][1]).toBe(true);
  });
});

describe('forEachModule', () => {
  it('calls callback for every module (size²)', () => {
    const modules = Array.from({ length: 5 }, () => Array<boolean>(5).fill(false));
    let count = 0;

    forEachModule(modules, 5, () => {
      count++;
    });

    expect(count).toBe(25);
  });

  it('provides correct row, col, and value', () => {
    const modules = [
      [true, false],
      [false, true],
    ];
    const visited: Array<[number, number, boolean]> = [];

    forEachModule(modules, 2, (row, col, value) => {
      visited.push([row, col, value]);
    });

    expect(visited).toEqual([
      [0, 0, true],
      [0, 1, false],
      [1, 0, false],
      [1, 1, true],
    ]);
  });
});

describe('calculateLogoRect', () => {
  it('centers logo in matrix', () => {
    const rect = calculateLogoRect(21, { src: '', sizeRatio: 0.2, excavate: true });

    // 21 * 0.2 = 4.2, round = 4, make odd = 5
    expect(rect.width).toBe(5);
    expect(rect.height).toBe(5);
    // center: (21-5)/2 = 8
    expect(rect.row).toBe(8);
    expect(rect.col).toBe(8);
  });

  it('ensures odd dimensions', () => {
    const rect = calculateLogoRect(21, { src: '', sizeRatio: 0.15, excavate: true });

    // 21 * 0.15 = 3.15, round = 3 (already odd)
    expect(rect.width % 2).toBe(1);
    expect(rect.height % 2).toBe(1);
  });

  it('throws when logo exceeds 30% area', () => {
    expect(() => {
      // sizeRatio 0.6 → ~13 modules → 13*13=169, 169/441=38% > 30%
      calculateLogoRect(21, { src: '', sizeRatio: 0.6, excavate: true });
    }).toThrow('Logo too large');
  });
});

describe('excavateLogoZone', () => {
  it('clears modules in logo rect', () => {
    const modules = Array.from({ length: 21 }, () => Array<boolean>(21).fill(true));
    const logoRect = { row: 8, col: 8, width: 5, height: 5 };

    const result = excavateLogoZone(modules, logoRect);

    // All modules in logo rect should be false
    for (let r = 8; r < 13; r++) {
      for (let c = 8; c < 13; c++) {
        expect(result[r][c]).toBe(false);
      }
    }

    // Modules outside logo rect should still be true
    expect(result[0][0]).toBe(true);
    expect(result[7][7]).toBe(true);
    expect(result[13][13]).toBe(true);
  });

  it('does not mutate original modules', () => {
    const modules = Array.from({ length: 21 }, () => Array<boolean>(21).fill(true));
    const logoRect = { row: 8, col: 8, width: 5, height: 5 };

    excavateLogoZone(modules, logoRect);

    // Original should still be all true
    expect(modules[10][10]).toBe(true);
  });
});

describe('angleToGradientCoords', () => {
  const totalPx = 100;

  it('0° → bottom-to-top', () => {
    const { x1, y1, x2, y2 } = angleToGradientCoords(0, totalPx);

    expect(x1).toBe(50);
    expect(y1).toBe(100);
    expect(x2).toBe(50);
    expect(y2).toBe(0);
  });

  it('90° → left-to-right', () => {
    const { x1, y1, x2, y2 } = angleToGradientCoords(90, totalPx);

    expect(x1).toBe(0);
    expect(y1).toBe(50);
    expect(x2).toBe(100);
    expect(y2).toBe(50);
  });

  it('180° → top-to-bottom', () => {
    const { x1, y1, x2, y2 } = angleToGradientCoords(180, totalPx);

    expect(x1).toBe(50);
    expect(y1).toBe(0);
    expect(x2).toBe(50);
    expect(y2).toBe(100);
  });

  it('45° → diagonal (bottom-left to top-right)', () => {
    const { x1, y1, x2, y2 } = angleToGradientCoords(45, totalPx);

    expect(x1).toBe(0);
    expect(y1).toBe(100);
    expect(x2).toBe(100);
    expect(y2).toBe(0);
  });
});
