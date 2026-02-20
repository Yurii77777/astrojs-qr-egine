import { ALIGNMENT_COORDS } from './tables';

export interface MatrixState {
  size: number;
  modules: (boolean | null)[][];
  isFunction: boolean[][];
}

function createEmptyMatrix(size: number): MatrixState {
  const modules: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array<boolean | null>(size).fill(null),
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );
  return { size, modules, isFunction };
}

function setModule(
  state: MatrixState,
  row: number,
  col: number,
  value: boolean,
  isFunc: boolean,
): void {
  state.modules[row][col] = value;
  if (isFunc) state.isFunction[row][col] = true;
}

function isFinderDark(r: number, c: number): boolean {
  return r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
}

function placeFinderPattern(state: MatrixState, startRow: number, startCol: number): void {
  for (let r = 0; r < 7; r++) {
    placeFinderRow(state, startRow + r, startCol, r);
  }
}

function placeFinderRow(state: MatrixState, row: number, startCol: number, r: number): void {
  for (let c = 0; c < 7; c++) {
    setModule(state, row, startCol + c, isFinderDark(r, c), true);
  }
}

function placeSeparators(state: MatrixState): void {
  const { size } = state;

  // Top-left: row 7, cols 0-7 and col 7, rows 0-7
  for (let i = 0; i < 8; i++) {
    setModule(state, 7, i, false, true);
    setModule(state, i, 7, false, true);
  }

  // Top-right: row 7, cols size-8..size-1 and col size-8, rows 0-7
  for (let i = 0; i < 8; i++) {
    setModule(state, 7, size - 8 + i, false, true);
    setModule(state, i, size - 8, false, true);
  }

  // Bottom-left: row size-8, cols 0-7 and col 7, rows size-8..size-1
  for (let i = 0; i < 8; i++) {
    setModule(state, size - 8, i, false, true);
    setModule(state, size - 8 + i, 7, false, true);
  }
}

function placeTimingPatterns(state: MatrixState): void {
  const { size } = state;
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    setModule(state, 6, i, dark, true);
    setModule(state, i, 6, dark, true);
  }
}

function isAlignmentDark(r: number, c: number): boolean {
  return Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
}

function placeOneAlignment(state: MatrixState, centerRow: number, centerCol: number): void {
  for (let r = -2; r <= 2; r++) {
    placeAlignmentRow(state, centerRow + r, centerCol, r);
  }
}

function placeAlignmentRow(state: MatrixState, row: number, centerCol: number, r: number): void {
  for (let c = -2; c <= 2; c++) {
    setModule(state, row, centerCol + c, isAlignmentDark(r, c), true);
  }
}

function overlapsFinderZone(row: number, col: number, size: number): boolean {
  return (row <= 8 && col <= 8) || (row <= 8 && col >= size - 8) || (row >= size - 8 && col <= 8);
}

function placeAlignmentPatterns(state: MatrixState, version: number): void {
  if (version < 2) return;

  const coords = ALIGNMENT_COORDS[version];
  const { size } = state;

  for (const row of coords) {
    placeAlignmentRow2(state, row, coords, size);
  }
}

function placeAlignmentRow2(state: MatrixState, row: number, coords: number[], size: number): void {
  for (const col of coords) {
    if (overlapsFinderZone(row, col, size)) continue;
    placeOneAlignment(state, row, col);
  }
}

function placeDarkModule(state: MatrixState, version: number): void {
  const row = 4 * version + 9;
  setModule(state, row, 8, true, true);
}

function reserveFormatInfo(state: MatrixState): void {
  const { size } = state;

  // Around top-left finder
  for (let i = 0; i <= 8; i++) {
    if (!state.isFunction[8][i]) {
      setModule(state, 8, i, false, true);
    }
    if (!state.isFunction[i][8]) {
      setModule(state, i, 8, false, true);
    }
  }

  // Near top-right finder: row 8, cols size-8 .. size-1
  for (let i = 0; i < 8; i++) {
    setModule(state, 8, size - 8 + i, false, true);
  }

  // Near bottom-left finder: col 8, rows size-7 .. size-1
  for (let i = 0; i < 7; i++) {
    setModule(state, size - 7 + i, 8, false, true);
  }
}

function reserveVersionStrip(
  state: MatrixState,
  row: number,
  col: number,
  dr: number,
  dc: number,
): void {
  for (let i = 0; i < 3; i++) {
    setModule(state, row + dr * i, col + dc * i, false, true);
  }
}

function reserveVersionInfo(state: MatrixState, version: number): void {
  if (version < 7) return;

  const { size } = state;

  for (let i = 0; i < 6; i++) {
    // Bottom-left: 3 rows (size-11..size-9) at col i → vertical strip
    reserveVersionStrip(state, size - 11, i, 1, 0);
    // Top-right: row i, 3 cols (size-11..size-9) → horizontal strip
    reserveVersionStrip(state, i, size - 11, 0, 1);
  }
}

export function createMatrix(version: number): MatrixState {
  const size = 4 * version + 17;
  const state = createEmptyMatrix(size);

  placeFinderPattern(state, 0, 0);
  placeFinderPattern(state, 0, size - 7);
  placeFinderPattern(state, size - 7, 0);

  placeSeparators(state);
  placeTimingPatterns(state);
  placeAlignmentPatterns(state, version);
  placeDarkModule(state, version);

  reserveFormatInfo(state);
  reserveVersionInfo(state, version);

  return state;
}
