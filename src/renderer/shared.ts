import type {
  Dimensions,
  FinderLayer,
  FinderPosition,
  LogoConfig,
  LogoRect,
  RenderOptions,
} from './types';

// --- Dimensions ---

export function calculateDimensions(options: RenderOptions): Dimensions {
  const matrixSize = options.matrix.size;
  const quietZoneModules = options.quietZone;
  const totalModules = matrixSize + 2 * quietZoneModules;
  const totalPx = totalModules * options.pixelSize;

  return {
    matrixSize,
    quietZoneModules,
    totalModules,
    totalPx,
    pixelSize: options.pixelSize,
  };
}

// --- Finder pattern detection ---

export function isFinderModule(row: number, col: number, size: number): boolean {
  return (
    (row < 8 && col < 8) || // top-left (with separator)
    (row < 8 && col >= size - 8) || // top-right
    (row >= size - 8 && col < 8) // bottom-left
  );
}

export function getFinderPositions(size: number): [FinderPosition, FinderPosition, FinderPosition] {
  return [
    { row: 0, col: 0 }, // top-left
    { row: 0, col: size - 7 }, // top-right
    { row: size - 7, col: 0 }, // bottom-left
  ];
}

export function getFinderLayer(localRow: number, localCol: number): FinderLayer {
  // 7x7 finder pattern layers:
  // outer = border (row/col is 0 or 6)
  // ring  = row/col is 1 or 5 (white ring)
  // center = inner 3x3 (rows 2-4, cols 2-4)
  if (localRow === 0 || localRow === 6 || localCol === 0 || localCol === 6) {
    return 'outer';
  }
  if (localRow === 1 || localRow === 5 || localCol === 1 || localCol === 5) {
    return 'ring';
  }
  return 'center';
}

// --- Module traversal ---

export function cloneModules(modules: boolean[][]): boolean[][] {
  return modules.map((row) => [...row]);
}

function forEachModuleInRow(
  row: boolean[],
  rowIdx: number,
  size: number,
  cb: (row: number, col: number, value: boolean) => void,
): void {
  for (let col = 0; col < size; col++) {
    cb(rowIdx, col, row[col]);
  }
}

export function forEachModule(
  modules: boolean[][],
  size: number,
  cb: (row: number, col: number, value: boolean) => void,
): void {
  for (let row = 0; row < size; row++) {
    forEachModuleInRow(modules[row], row, size, cb);
  }
}

// --- Logo ---

export function calculateLogoRect(matrixSize: number, logo: LogoConfig): LogoRect {
  const logoModules = Math.round(matrixSize * logo.sizeRatio);
  // Ensure odd dimensions for symmetric centering
  const width = logoModules % 2 === 0 ? logoModules + 1 : logoModules;
  const height = width;

  const logoArea = width * height;
  const totalArea = matrixSize * matrixSize;
  if (logoArea / totalArea > 0.3) {
    throw new Error('Logo too large — reduce size or increase EC level');
  }

  const row = Math.floor((matrixSize - height) / 2);
  const col = Math.floor((matrixSize - width) / 2);

  return { row, col, width, height };
}

function clearLogoRow(row: boolean[], startCol: number, width: number): void {
  for (let col = startCol; col < startCol + width; col++) {
    row[col] = false;
  }
}

export function excavateLogoZone(modules: boolean[][], logoRect: LogoRect): boolean[][] {
  const result = cloneModules(modules);

  for (let row = logoRect.row; row < logoRect.row + logoRect.height; row++) {
    clearLogoRow(result[row], logoRect.col, logoRect.width);
  }

  return result;
}

// --- Gradient coordinate conversion ---

export function angleToGradientCoords(
  angle: number,
  totalPx: number,
): { x1: number; y1: number; x2: number; y2: number } {
  // CSS gradient angle: 0° = bottom-to-top, 90° = left-to-right, clockwise
  const rad = ((angle - 90) * Math.PI) / 180;
  const half = totalPx / 2;

  // CSS gradient line extends to cover the full box (corner-to-corner for diagonals)
  const lineLength = totalPx * (Math.abs(Math.sin(rad)) + Math.abs(Math.cos(rad)));
  const halfLine = lineLength / 2;

  const x1 = Math.round(half - Math.cos(rad) * halfLine);
  const y1 = Math.round(half - Math.sin(rad) * halfLine);
  const x2 = Math.round(half + Math.cos(rad) * halfLine);
  const y2 = Math.round(half + Math.sin(rad) * halfLine);

  return { x1, y1, x2, y2 };
}

// --- Blob shape control points (normalized 0-1 for 3x3 inner finder) ---

export const BLOB_CONTROL_POINTS = [
  // 4 cubic bezier segments forming a blob
  // Each: [cp1x, cp1y, cp2x, cp2y, endx, endy] (normalized to unit square)
  [0.8, 0.0, 1.0, 0.2, 1.0, 0.5],
  [1.0, 0.8, 0.8, 1.0, 0.5, 1.0],
  [0.2, 1.0, 0.0, 0.8, 0.0, 0.5],
  [0.0, 0.2, 0.2, 0.0, 0.5, 0.0],
] as const;
