import { describe, expect, it } from 'vitest';

import { createMatrix } from '../matrix';
import { placeData } from '../placer';

describe('placeData', () => {
  it('fills all non-function modules in V1', () => {
    const state = createMatrix(1);
    // V1 total codewords = 26 bytes × 8 = 208 bits, no remainder
    const bits = new Uint8Array(208);
    bits.fill(1); // all dark

    placeData(state, bits);

    // All modules should now be non-null
    for (let r = 0; r < state.size; r++) {
      for (let c = 0; c < state.size; c++) {
        expect(state.modules[r][c]).not.toBeNull();
      }
    }
  });

  it('does not overwrite function patterns', () => {
    const state = createMatrix(1);
    const bits = new Uint8Array(208);
    bits.fill(1);

    // Remember function pattern values
    const finderTopLeft = state.modules[0][0]; // should be true (dark)
    const separatorModule = state.modules[7][0]; // should be false (white)

    placeData(state, bits);

    // Function patterns should remain unchanged
    expect(state.modules[0][0]).toBe(finderTopLeft);
    expect(state.modules[7][0]).toBe(separatorModule);
  });

  it('places data in zigzag pattern starting from bottom-right', () => {
    const state = createMatrix(1);
    const bits = new Uint8Array(208);
    // Mark all bits as 0 except first two
    bits[0] = 1;
    bits[1] = 0;

    placeData(state, bits);

    // First strip: cols 20, 19, going upward from row 20
    // (20, 20) is not function → gets bits[0] = 1
    // (20, 19) is not function → gets bits[1] = 0
    expect(state.modules[20][20]).toBe(true);
    expect(state.modules[20][19]).toBe(false);

    // Next row up: (19, 20) and (19, 19)
    expect(state.modules[19][20]).toBe(false); // bits[2] = 0
    expect(state.modules[19][19]).toBe(false); // bits[3] = 0
  });

  it('skips column 6 (timing column)', () => {
    const state = createMatrix(1);
    const bits = new Uint8Array(208);

    placeData(state, bits);

    // Column 6 is timing → all function modules
    for (let r = 0; r < state.size; r++) {
      expect(state.isFunction[r][6]).toBe(true);
    }
  });
});
