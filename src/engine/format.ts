import type { ECLevel } from './types';

// EC level bits — NOT in numeric order
const EC_BITS: Record<ECLevel, number> = {
  L: 0b01,
  M: 0b00,
  Q: 0b11,
  H: 0b10,
};

const FORMAT_GENERATOR = 0b10100110111;
const FORMAT_MASK = 0b101010000010010;

const VERSION_GENERATOR = 0b1111100100101;

function calculateFormatBits(ecLevel: ECLevel, maskIndex: number): number {
  const data = (EC_BITS[ecLevel] << 3) | maskIndex;
  let remainder = data << 10;

  for (let i = 14; i >= 10; i--) {
    if (remainder & (1 << i)) {
      remainder ^= FORMAT_GENERATOR << (i - 10);
    }
  }

  return ((data << 10) | remainder) ^ FORMAT_MASK;
}

function calculateVersionBits(version: number): number {
  const data = version;
  let remainder = data << 12;

  for (let i = 17; i >= 12; i--) {
    if (remainder & (1 << i)) {
      remainder ^= VERSION_GENERATOR << (i - 12);
    }
  }

  return (data << 12) | remainder;
}

// Format info bit positions around the QR code (ISO 18004 Table 9)
const FORMAT_POSITIONS_1: [number, number][] = [
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [7, 8],
  [8, 8],
  [8, 7],
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0],
];

function getFormatPositions2(size: number): [number, number][] {
  return [
    [8, size - 1],
    [8, size - 2],
    [8, size - 3],
    [8, size - 4],
    [8, size - 5],
    [8, size - 6],
    [8, size - 7],
    [8, size - 8],
    [size - 7, 8],
    [size - 6, 8],
    [size - 5, 8],
    [size - 4, 8],
    [size - 3, 8],
    [size - 2, 8],
    [size - 1, 8],
  ];
}

function writeFormatBits(
  modules: boolean[][],
  isFunction: boolean[][],
  size: number,
  formatBits: number,
): void {
  const positions2 = getFormatPositions2(size);

  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >>> (14 - i)) & 1) === 1;

    const [r1, c1] = FORMAT_POSITIONS_1[i];
    modules[r1][c1] = bit;
    isFunction[r1][c1] = true;

    const [r2, c2] = positions2[i];
    modules[r2][c2] = bit;
    isFunction[r2][c2] = true;
  }
}

function writeVersionBits(
  modules: boolean[][],
  isFunction: boolean[][],
  size: number,
  versionBits: number,
): void {
  for (let i = 0; i < 18; i++) {
    const bit = ((versionBits >>> i) & 1) === 1;
    const row = Math.floor(i / 3);
    const col = (i % 3) + size - 11;

    // Top-right block
    modules[row][col] = bit;
    isFunction[row][col] = true;

    // Bottom-left block (transposed)
    modules[col][row] = bit;
    isFunction[col][row] = true;
  }
}

export function writeFormatInfo(
  modules: boolean[][],
  isFunction: boolean[][],
  size: number,
  version: number,
  ecLevel: ECLevel,
  maskIndex: number,
): void {
  const formatBits = calculateFormatBits(ecLevel, maskIndex);
  writeFormatBits(modules, isFunction, size, formatBits);

  if (version >= 7) {
    const versionBits = calculateVersionBits(version);
    writeVersionBits(modules, isFunction, size, versionBits);
  }
}

export { calculateFormatBits, calculateVersionBits };
