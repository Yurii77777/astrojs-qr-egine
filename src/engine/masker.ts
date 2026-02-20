const MASK_FNS: Array<(i: number, j: number) => boolean> = [
  (i, j) => (i + j) % 2 === 0,
  (i) => i % 2 === 0,
  (_i, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
  (i, j) => (((i + j) % 2) + ((i * j) % 3)) % 2 === 0,
];

function cloneModules(modules: boolean[][]): boolean[][] {
  return modules.map((row) => [...row]);
}

function applyMaskToRow(
  row: boolean[],
  isFuncRow: boolean[],
  rowIdx: number,
  maskFn: (i: number, j: number) => boolean,
): void {
  for (let col = 0; col < row.length; col++) {
    if (!isFuncRow[col] && maskFn(rowIdx, col)) {
      row[col] = !row[col];
    }
  }
}

function applyMask(modules: boolean[][], isFunction: boolean[][], maskIndex: number): boolean[][] {
  const result = cloneModules(modules);
  const maskFn = MASK_FNS[maskIndex];

  for (let row = 0; row < result.length; row++) {
    applyMaskToRow(result[row], isFunction[row], row, maskFn);
  }

  return result;
}

// Penalty Rule 1: 5+ same-color modules in a row/column
function penaltyRunLength(line: boolean[]): number {
  let penalty = 0;
  let runLength = 1;

  for (let i = 1; i < line.length; i++) {
    if (line[i] === line[i - 1]) {
      runLength++;
    } else {
      if (runLength >= 5) penalty += runLength - 2;
      runLength = 1;
    }
  }
  if (runLength >= 5) penalty += runLength - 2;

  return penalty;
}

function getColumn(modules: boolean[][], col: number): boolean[] {
  const column: boolean[] = [];
  for (let row = 0; row < modules.length; row++) {
    column.push(modules[row][col]);
  }
  return column;
}

function penaltyRule1(modules: boolean[][]): number {
  const size = modules.length;
  let penalty = 0;

  for (let row = 0; row < size; row++) {
    penalty += penaltyRunLength(modules[row]);
  }

  for (let col = 0; col < size; col++) {
    penalty += penaltyRunLength(getColumn(modules, col));
  }

  return penalty;
}

// Penalty Rule 2: 2×2 same-color blocks
function isBlock2x2(modules: boolean[][], row: number, col: number): boolean {
  const val = modules[row][col];
  return (
    val === modules[row][col + 1] &&
    val === modules[row + 1][col] &&
    val === modules[row + 1][col + 1]
  );
}

function penaltyRule2(modules: boolean[][]): number {
  const size = modules.length;
  let penalty = 0;

  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      if (isBlock2x2(modules, row, col)) penalty += 3;
    }
  }

  return penalty;
}

// Penalty Rule 3: finder-like patterns (1011101 with 4 light on either side)
const PATTERN_1 = [true, false, true, true, true, false, true, false, false, false, false];
const PATTERN_2 = [false, false, false, false, true, false, true, true, true, false, true];

function matchesPattern(line: boolean[], start: number, pat: boolean[]): boolean {
  for (let i = 0; i < pat.length; i++) {
    if (line[start + i] !== pat[i]) return false;
  }
  return true;
}

function countPatternInLine(line: boolean[]): number {
  let count = 0;
  for (let i = 0; i <= line.length - 11; i++) {
    if (matchesPattern(line, i, PATTERN_1) || matchesPattern(line, i, PATTERN_2)) {
      count++;
    }
  }
  return count;
}

function penaltyRule3(modules: boolean[][]): number {
  const size = modules.length;
  let count = 0;

  for (let row = 0; row < size; row++) {
    count += countPatternInLine(modules[row]);
  }

  for (let col = 0; col < size; col++) {
    count += countPatternInLine(getColumn(modules, col));
  }

  return count * 40;
}

// Penalty Rule 4: dark/light balance
function countDark(row: boolean[]): number {
  let count = 0;
  for (const m of row) {
    if (m) count++;
  }
  return count;
}

function penaltyRule4(modules: boolean[][]): number {
  const size = modules.length;
  const total = size * size;
  let darkCount = 0;

  for (const row of modules) {
    darkCount += countDark(row);
  }

  const percent = (darkCount / total) * 100;
  const prev = Math.floor(percent / 5) * 5;
  const next = prev + 5;
  return (Math.min(Math.abs(prev - 50), Math.abs(next - 50)) / 5) * 10;
}

function calculatePenalty(modules: boolean[][]): number {
  return (
    penaltyRule1(modules) + penaltyRule2(modules) + penaltyRule3(modules) + penaltyRule4(modules)
  );
}

export interface MaskResult {
  maskIndex: number;
  modules: boolean[][];
}

export function evaluateMasks(modules: boolean[][], isFunction: boolean[][]): MaskResult {
  let bestMask = 0;
  let bestPenalty = Infinity;
  let bestModules: boolean[][] = modules;

  for (let mask = 0; mask < 8; mask++) {
    const masked = applyMask(modules, isFunction, mask);
    const penalty = calculatePenalty(masked);

    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      bestModules = masked;
    }
  }

  return { maskIndex: bestMask, modules: bestModules };
}

export { applyMask, calculatePenalty, MASK_FNS };
