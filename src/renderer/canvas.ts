import type { FinderPosition, LinearGradient, ModuleColor, RenderOptions } from './types';
import {
  BLOB_CONTROL_POINTS,
  angleToGradientCoords,
  calculateDimensions,
  calculateLogoRect,
  excavateLogoZone,
  forEachModule,
  getFinderPositions,
  isFinderModule,
} from './shared';

// --- Fill style creation ---

function createCanvasFillStyle(
  color: ModuleColor,
  ctx: CanvasRenderingContext2D,
  totalPx: number,
): string | CanvasGradient {
  if (color.type === 'solid') {
    return color.value;
  }

  if (color.type === 'linear') {
    return createLinearGradient(color, ctx, totalPx);
  }

  // radial
  const half = totalPx / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(color.stops[0].offset, color.stops[0].color);
  grad.addColorStop(color.stops[1].offset, color.stops[1].color);
  return grad;
}

function createLinearGradient(
  color: LinearGradient,
  ctx: CanvasRenderingContext2D,
  totalPx: number,
): CanvasGradient {
  const { x1, y1, x2, y2 } = angleToGradientCoords(color.angle, totalPx);
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(color.stops[0].offset, color.stops[0].color);
  grad.addColorStop(color.stops[1].offset, color.stops[1].color);
  return grad;
}

// --- Module shape drawing ---

function drawSquareModule(ctx: CanvasRenderingContext2D, x: number, y: number, px: number): void {
  ctx.fillRect(x, y, px, px);
}

function drawRoundedModule(ctx: CanvasRenderingContext2D, x: number, y: number, px: number): void {
  const radius = px * 0.3;
  ctx.beginPath();
  ctx.roundRect(x, y, px, px, radius);
  ctx.fill();
}

function drawCircleModule(ctx: CanvasRenderingContext2D, x: number, y: number, px: number): void {
  const half = px / 2;
  ctx.beginPath();
  ctx.arc(x + half, y + half, half, 0, Math.PI * 2);
  ctx.fill();
}

function drawDiamondModule(ctx: CanvasRenderingContext2D, x: number, y: number, px: number): void {
  const half = px / 2;
  ctx.beginPath();
  ctx.moveTo(x + half, y); // top
  ctx.lineTo(x + px, y + half); // right
  ctx.lineTo(x + half, y + px); // bottom
  ctx.lineTo(x, y + half); // left
  ctx.closePath();
  ctx.fill();
}

type ModuleDrawFn = (ctx: CanvasRenderingContext2D, x: number, y: number, px: number) => void;

const MODULE_DRAW_FNS: Record<string, ModuleDrawFn> = {
  square: drawSquareModule,
  rounded: drawRoundedModule,
  circle: drawCircleModule,
  diamond: drawDiamondModule,
};

// --- Finder pattern drawing ---

function drawFinderOuterSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.fillRect(x, y, size, size);
}

function drawFinderOuterRounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius);
  ctx.fill();
}

function drawFinderRingSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.fillRect(x, y, size, size);
}

function drawFinderRingRounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const radius = size * 0.15;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius);
  ctx.fill();
}

function drawFinderCenterSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  ctx.fillRect(x, y, size, size);
}

function drawFinderCenterRounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const radius = size * 0.25;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius);
  ctx.fill();
}

function drawBlobShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x + BLOB_CONTROL_POINTS[3][4] * size, y + BLOB_CONTROL_POINTS[3][5] * size);

  for (const [cp1x, cp1y, cp2x, cp2y, endx, endy] of BLOB_CONTROL_POINTS) {
    ctx.bezierCurveTo(
      x + cp1x * size,
      y + cp1y * size,
      x + cp2x * size,
      y + cp2y * size,
      x + endx * size,
      y + endy * size,
    );
  }

  ctx.closePath();
  ctx.fill();
}

function drawSingleFinder(
  ctx: CanvasRenderingContext2D,
  finder: FinderPosition,
  px: number,
  outerShape: 'square' | 'rounded',
  innerShape: 'square' | 'rounded' | 'blob',
  finderColor: string,
  bgColor: string,
): void {
  const x = finder.col * px;
  const y = finder.row * px;

  // Layer 1: Outer 7x7 (finder color)
  ctx.fillStyle = finderColor;
  if (outerShape === 'rounded') {
    drawFinderOuterRounded(ctx, x, y, 7 * px);
  } else {
    drawFinderOuterSquare(ctx, x, y, 7 * px);
  }

  // Layer 2: Ring 5x5 (background color — punches a hole)
  ctx.fillStyle = bgColor;
  if (outerShape === 'rounded') {
    drawFinderRingRounded(ctx, x + px, y + px, 5 * px);
  } else {
    drawFinderRingSquare(ctx, x + px, y + px, 5 * px);
  }

  // Layer 3: Center 3x3 (finder color)
  ctx.fillStyle = finderColor;
  if (innerShape === 'blob') {
    drawBlobShape(ctx, x + 2 * px, y + 2 * px, 3 * px);
  } else if (innerShape === 'rounded') {
    drawFinderCenterRounded(ctx, x + 2 * px, y + 2 * px, 3 * px);
  } else {
    drawFinderCenterSquare(ctx, x + 2 * px, y + 2 * px, 3 * px);
  }
}

function drawFinders(
  ctx: CanvasRenderingContext2D,
  matrixSize: number,
  px: number,
  options: RenderOptions,
  bgColor: string,
): void {
  const positions = getFinderPositions(matrixSize);
  const finderColor = options.finderStyle.color.value;

  for (const finder of positions) {
    drawSingleFinder(
      ctx,
      finder,
      px,
      options.finderStyle.outerShape,
      options.finderStyle.innerShape,
      finderColor,
      bgColor,
    );
  }
}

// --- Regular module drawing ---

function drawRegularModule(
  row: number,
  col: number,
  value: boolean,
  matrixSize: number,
  px: number,
  ctx: CanvasRenderingContext2D,
  drawFn: ModuleDrawFn,
): void {
  if (!value || isFinderModule(row, col, matrixSize)) return;
  drawFn(ctx, col * px, row * px, px);
}

function drawModules(
  modules: boolean[][],
  matrixSize: number,
  px: number,
  ctx: CanvasRenderingContext2D,
  fillStyle: string | CanvasGradient,
  options: RenderOptions,
): void {
  const drawFn = MODULE_DRAW_FNS[options.moduleStyle.shape];
  ctx.fillStyle = fillStyle;

  forEachModule(modules, matrixSize, (row, col, value) => {
    drawRegularModule(row, col, value, matrixSize, px, ctx, drawFn);
  });
}

// --- Logo drawing ---

function drawLogo(
  ctx: CanvasRenderingContext2D,
  options: RenderOptions,
  matrixSize: number,
  px: number,
): void {
  if (!options.logo) return;

  const logoRect = calculateLogoRect(matrixSize, options.logo);
  const img = new Image();
  img.src = options.logo.src;

  ctx.drawImage(
    img,
    logoRect.col * px,
    logoRect.row * px,
    logoRect.width * px,
    logoRect.height * px,
  );
}

// --- Main render function ---

export function renderCanvas(options: RenderOptions, ctx: CanvasRenderingContext2D): void {
  const dims = calculateDimensions(options);
  const { matrixSize, totalPx, pixelSize: px } = dims;

  // Optionally excavate logo zone (clone matrix, never mutate)
  let modules = options.matrix.modules;
  if (options.logo?.excavate) {
    const logoRect = calculateLogoRect(matrixSize, options.logo);
    modules = excavateLogoZone(modules, logoRect);
  }

  // Clear entire canvas
  ctx.clearRect(0, 0, totalPx, totalPx);

  // Draw background
  const bgColor = options.background === 'transparent' ? 'rgba(0,0,0,0)' : options.background.value;
  if (options.background !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalPx, totalPx);
  }

  // Apply quiet zone offset
  ctx.save();
  ctx.translate(dims.quietZoneModules * px, dims.quietZoneModules * px);

  // Create fill style once for all modules (gradient spans full QR area)
  const qrAreaPx = matrixSize * px;
  const fillStyle = createCanvasFillStyle(options.moduleStyle.color, ctx, qrAreaPx);

  // Draw regular modules (skipping finder zones)
  drawModules(modules, matrixSize, px, ctx, fillStyle, options);

  // Draw 3 finder patterns as composite shapes
  drawFinders(ctx, matrixSize, px, options, bgColor);

  // Draw logo if present
  drawLogo(ctx, options, matrixSize, px);

  ctx.restore();
}
