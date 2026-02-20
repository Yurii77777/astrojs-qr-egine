import type { MatrixState } from './matrix';

function placeStripRow(
  state: MatrixState,
  row: number,
  col: number,
  bits: Uint8Array,
  bitIdx: number,
): number {
  const { modules, isFunction } = state;

  for (const dc of [0, 1]) {
    const c = col - dc;
    if (c < 0) continue;
    if (isFunction[row][c]) continue;
    if (modules[row][c] !== null) continue;

    modules[row][c] = bitIdx < bits.length ? bits[bitIdx] === 1 : false;
    bitIdx++;
  }

  return bitIdx;
}

export function placeData(state: MatrixState, bits: Uint8Array): void {
  const { size } = state;
  let bitIdx = 0;
  let upward = true;

  let col = size - 1;
  while (col > 0) {
    if (col === 6) col--;

    for (let row = 0; row < size; row++) {
      const r = upward ? size - 1 - row : row;
      bitIdx = placeStripRow(state, r, col, bits, bitIdx);
    }

    upward = !upward;
    col -= 2;
  }
}
