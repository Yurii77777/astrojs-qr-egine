import { describe, expect, it } from 'vitest';

import { createMatrix } from '../matrix';
import { placeData } from '../placer';
import { MASK_FNS, applyMask, calculatePenalty, evaluateMasks } from '../masker';

describe('MASK_FNS', () => {
  it('has 8 mask functions', () => {
    expect(MASK_FNS.length).toBe(8);
  });

  it('mask 0: (i + j) % 2 === 0', () => {
    expect(MASK_FNS[0](0, 0)).toBe(true);
    expect(MASK_FNS[0](0, 1)).toBe(false);
    expect(MASK_FNS[0](1, 0)).toBe(false);
    expect(MASK_FNS[0](1, 1)).toBe(true);
  });

  it('mask 1: i % 2 === 0', () => {
    expect(MASK_FNS[1](0, 0)).toBe(true);
    expect(MASK_FNS[1](0, 5)).toBe(true);
    expect(MASK_FNS[1](1, 0)).toBe(false);
  });

  it('mask 2: j % 3 === 0', () => {
    expect(MASK_FNS[2](0, 0)).toBe(true);
    expect(MASK_FNS[2](0, 1)).toBe(false);
    expect(MASK_FNS[2](0, 3)).toBe(true);
  });
});

describe('applyMask', () => {
  it('only toggles data modules, not function patterns', () => {
    const state = createMatrix(1);
    const bits = new Uint8Array(208);
    bits.fill(0);
    placeData(state, bits);

    const modules = state.modules as boolean[][];
    const finderBefore = modules[0][0];

    const masked = applyMask(modules, state.isFunction, 0);

    // Function module should stay the same
    expect(masked[0][0]).toBe(finderBefore);

    // At least some data modules should have been toggled
    let toggleCount = 0;
    for (let r = 0; r < 21; r++) {
      for (let c = 0; c < 21; c++) {
        if (!state.isFunction[r][c] && masked[r][c] !== modules[r][c]) {
          toggleCount++;
        }
      }
    }
    expect(toggleCount).toBeGreaterThan(0);
  });

  it('does not mutate the original matrix', () => {
    const state = createMatrix(1);
    const bits = new Uint8Array(208);
    placeData(state, bits);

    const modules = state.modules as boolean[][];
    const original = modules.map((row) => [...row]);

    applyMask(modules, state.isFunction, 0);

    // Original should be unchanged
    for (let r = 0; r < 21; r++) {
      for (let c = 0; c < 21; c++) {
        expect(modules[r][c]).toBe(original[r][c]);
      }
    }
  });
});

describe('calculatePenalty', () => {
  it('returns a non-negative number', () => {
    const modules = Array.from({ length: 21 }, () => Array<boolean>(21).fill(false));
    expect(calculatePenalty(modules)).toBeGreaterThanOrEqual(0);
  });

  it('all-dark matrix has high penalty', () => {
    const modules = Array.from({ length: 21 }, () => Array<boolean>(21).fill(true));
    const penalty = calculatePenalty(modules);
    expect(penalty).toBeGreaterThan(100);
  });
});

describe('evaluateMasks', () => {
  it('returns best mask index and modules for V1', () => {
    const state = createMatrix(1);
    const bits = new Uint8Array(208);
    for (let i = 0; i < bits.length; i++) bits[i] = i % 2;
    placeData(state, bits);

    const result = evaluateMasks(state.modules as boolean[][], state.isFunction);

    expect(result.maskIndex).toBeGreaterThanOrEqual(0);
    expect(result.maskIndex).toBeLessThan(8);
    expect(result.modules.length).toBe(21);
  });
});
