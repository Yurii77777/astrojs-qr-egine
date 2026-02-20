import { describe, expect, it } from 'vitest';

import { createMatrix } from '../matrix';

describe('createMatrix', () => {
  it('V1 creates 21×21 matrix', () => {
    const state = createMatrix(1);
    expect(state.size).toBe(21);
    expect(state.modules.length).toBe(21);
    expect(state.modules[0].length).toBe(21);
  });

  it('V7 creates 45×45 matrix', () => {
    const state = createMatrix(7);
    expect(state.size).toBe(45); // 4*7 + 17 = 45
  });

  it('finder patterns placed at three corners', () => {
    const state = createMatrix(1);
    const { modules, isFunction } = state;

    // Top-left finder: dark border
    expect(modules[0][0]).toBe(true);
    expect(modules[0][6]).toBe(true);
    expect(modules[6][0]).toBe(true);
    expect(modules[6][6]).toBe(true);

    // Top-left finder: white ring
    expect(modules[1][1]).toBe(false);

    // Top-left finder: dark center
    expect(modules[2][2]).toBe(true);
    expect(modules[3][3]).toBe(true);
    expect(modules[4][4]).toBe(true);

    // All finder modules marked as function
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        expect(isFunction[r][c]).toBe(true);
      }
    }

    // Top-right finder
    expect(modules[0][14]).toBe(true);
    expect(modules[0][20]).toBe(true);

    // Bottom-left finder
    expect(modules[14][0]).toBe(true);
    expect(modules[20][0]).toBe(true);
  });

  it('separators are white and marked as function', () => {
    const state = createMatrix(1);
    const { modules, isFunction } = state;

    // Top-left separator row
    for (let c = 0; c < 8; c++) {
      expect(modules[7][c]).toBe(false);
      expect(isFunction[7][c]).toBe(true);
    }

    // Top-left separator col
    for (let r = 0; r < 8; r++) {
      expect(modules[r][7]).toBe(false);
      expect(isFunction[r][7]).toBe(true);
    }
  });

  it('timing patterns alternate dark/light starting dark', () => {
    const state = createMatrix(1);
    const { modules } = state;

    // Horizontal timing (row 6, between separators)
    expect(modules[6][8]).toBe(true); // i=8, even → dark
    expect(modules[6][9]).toBe(false);
    expect(modules[6][10]).toBe(true);
    expect(modules[6][11]).toBe(false);
    expect(modules[6][12]).toBe(true);

    // Vertical timing (col 6, between separators)
    expect(modules[8][6]).toBe(true);
    expect(modules[9][6]).toBe(false);
    expect(modules[10][6]).toBe(true);
  });

  it('dark module at (4*v+9, 8)', () => {
    const state = createMatrix(1);
    expect(state.modules[13][8]).toBe(true);
    expect(state.isFunction[13][8]).toBe(true);

    const state7 = createMatrix(7);
    expect(state7.modules[37][8]).toBe(true);
  });

  it('V1 has no alignment patterns', () => {
    const state = createMatrix(1);
    // Center area should have null (not placed) modules for data
    expect(state.modules[10][10]).toBeNull();
  });

  it('V2 has alignment pattern at (18, 18)', () => {
    const state = createMatrix(2);
    // Alignment center at (18, 18)
    expect(state.modules[18][18]).toBe(true); // center dark
    expect(state.isFunction[18][18]).toBe(true);
    expect(state.modules[17][17]).toBe(false); // ring is white
    expect(state.modules[16][16]).toBe(true); // border is dark
  });

  it('format info zones are reserved', () => {
    const state = createMatrix(1);

    // Row 8 near top-left
    expect(state.isFunction[8][0]).toBe(true);
    expect(state.isFunction[8][8]).toBe(true);

    // Top-right format area
    expect(state.isFunction[8][state.size - 1]).toBe(true);

    // Bottom-left format area
    expect(state.isFunction[state.size - 1][8]).toBe(true);
  });

  it('version info zones reserved for V7+', () => {
    const state7 = createMatrix(7);
    const size = state7.size;

    // Top-right version info: rows 0-5, cols size-11..size-9
    expect(state7.isFunction[0][size - 11]).toBe(true);
    expect(state7.isFunction[5][size - 9]).toBe(true);

    // Bottom-left version info: rows size-11..size-9, cols 0-5
    expect(state7.isFunction[size - 11][0]).toBe(true);
    expect(state7.isFunction[size - 9][5]).toBe(true);
  });

  it('V6 has no version info zones', () => {
    const state = createMatrix(6);
    const size = state.size;
    // The area where version info would be should not be reserved
    // (aside from other function patterns)
    // For V6, size=41, version info area would be rows 0-5, cols 30-32
    // These should not be isFunction unless they overlap with another pattern
    expect(state.isFunction[0][size - 11]).toBe(false);
  });
});
