import type { LinearGradient, ModuleColor, RadialGradient, RenderOptions } from './types';
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

// --- Gradient defs ---

function buildLinearGradientDef(color: LinearGradient, totalPx: number): string {
  const { x1, y1, x2, y2 } = angleToGradientCoords(color.angle, totalPx);
  const stop0 = `<stop offset="${color.stops[0].offset}" stop-color="${color.stops[0].color}"/>`;
  const stop1 = `<stop offset="${color.stops[1].offset}" stop-color="${color.stops[1].color}"/>`;
  return `<linearGradient id="mg" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stop0}${stop1}</linearGradient>`;
}

function buildRadialGradientDef(color: RadialGradient, totalPx: number): string {
  const half = Math.round(totalPx / 2);
  const stop0 = `<stop offset="${color.stops[0].offset}" stop-color="${color.stops[0].color}"/>`;
  const stop1 = `<stop offset="${color.stops[1].offset}" stop-color="${color.stops[1].color}"/>`;
  return `<radialGradient id="mg" gradientUnits="userSpaceOnUse" cx="${half}" cy="${half}" r="${half}">${stop0}${stop1}</radialGradient>`;
}

function buildGradientDefs(color: ModuleColor, qrAreaPx: number): string {
  if (color.type === 'solid') return '';
  if (color.type === 'linear') return `<defs>${buildLinearGradientDef(color, qrAreaPx)}</defs>`;
  return `<defs>${buildRadialGradientDef(color, qrAreaPx)}</defs>`;
}

function getFillRef(color: ModuleColor): string {
  if (color.type === 'solid') return color.value;
  return 'url(#mg)';
}

// --- Module shape elements ---

function squareModuleElement(x: number, y: number, px: number, fill: string): string {
  return `<rect x="${x}" y="${y}" width="${px}" height="${px}" fill="${fill}"/>`;
}

function roundedModuleElement(x: number, y: number, px: number, fill: string): string {
  const r = Math.round(px * 0.3);
  return `<rect x="${x}" y="${y}" width="${px}" height="${px}" rx="${r}" fill="${fill}"/>`;
}

function circleModuleElement(x: number, y: number, px: number, fill: string): string {
  const half = Math.round(px / 2);
  return `<circle cx="${x + half}" cy="${y + half}" r="${half}" fill="${fill}"/>`;
}

function diamondModuleElement(x: number, y: number, px: number, fill: string): string {
  const half = Math.round(px / 2);
  const points = `${x + half},${y} ${x + px},${y + half} ${x + half},${y + px} ${x},${y + half}`;
  return `<polygon points="${points}" fill="${fill}"/>`;
}

type ModuleElementFn = (x: number, y: number, px: number, fill: string) => string;

const MODULE_ELEMENT_FNS: Record<string, ModuleElementFn> = {
  square: squareModuleElement,
  rounded: roundedModuleElement,
  circle: circleModuleElement,
  diamond: diamondModuleElement,
};

// --- Regular module collection ---

function collectModuleElement(
  row: number,
  col: number,
  value: boolean,
  matrixSize: number,
  px: number,
  fill: string,
  elementFn: ModuleElementFn,
): string {
  if (!value || isFinderModule(row, col, matrixSize)) return '';
  return elementFn(col * px, row * px, px, fill);
}

function buildModuleElements(
  modules: boolean[][],
  matrixSize: number,
  px: number,
  fill: string,
  shape: string,
): string {
  const elementFn = MODULE_ELEMENT_FNS[shape];
  const parts: string[] = [];

  forEachModule(modules, matrixSize, (row, col, value) => {
    const el = collectModuleElement(row, col, value, matrixSize, px, fill, elementFn);
    if (el) parts.push(el);
  });

  return parts.join('');
}

// --- Finder pattern elements ---

function finderOuterElement(
  x: number,
  y: number,
  size: number,
  fill: string,
  shape: 'square' | 'rounded',
): string {
  if (shape === 'rounded') {
    const r = Math.round(size * 0.2);
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" fill="${fill}"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${fill}"/>`;
}

function finderRingElement(
  x: number,
  y: number,
  size: number,
  fill: string,
  shape: 'square' | 'rounded',
): string {
  if (shape === 'rounded') {
    const r = Math.round(size * 0.15);
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" fill="${fill}"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${fill}"/>`;
}

function finderCenterElement(
  x: number,
  y: number,
  size: number,
  fill: string,
  shape: 'square' | 'rounded' | 'blob',
): string {
  if (shape === 'blob') {
    return buildBlobElement(x, y, size, fill);
  }
  if (shape === 'rounded') {
    const r = Math.round(size * 0.25);
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" fill="${fill}"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${fill}"/>`;
}

function buildBlobElement(x: number, y: number, size: number, fill: string): string {
  const startX = Math.round(x + BLOB_CONTROL_POINTS[3][4] * size);
  const startY = Math.round(y + BLOB_CONTROL_POINTS[3][5] * size);

  let d = `M${startX},${startY}`;

  for (const [cp1x, cp1y, cp2x, cp2y, endx, endy] of BLOB_CONTROL_POINTS) {
    d += ` C${Math.round(x + cp1x * size)},${Math.round(y + cp1y * size)}`;
    d += ` ${Math.round(x + cp2x * size)},${Math.round(y + cp2y * size)}`;
    d += ` ${Math.round(x + endx * size)},${Math.round(y + endy * size)}`;
  }

  d += 'Z';
  return `<path d="${d}" fill="${fill}"/>`;
}

function buildSingleFinderElement(
  finderX: number,
  finderY: number,
  px: number,
  outerShape: 'square' | 'rounded',
  innerShape: 'square' | 'rounded' | 'blob',
  finderColor: string,
  bgColor: string,
): string {
  const parts: string[] = [];

  // Layer 1: Outer 7x7
  parts.push(finderOuterElement(finderX, finderY, 7 * px, finderColor, outerShape));

  // Layer 2: Ring 5x5 (background color)
  parts.push(finderRingElement(finderX + px, finderY + px, 5 * px, bgColor, outerShape));

  // Layer 3: Center 3x3
  parts.push(
    finderCenterElement(finderX + 2 * px, finderY + 2 * px, 3 * px, finderColor, innerShape),
  );

  return parts.join('');
}

function buildFinderElements(
  matrixSize: number,
  px: number,
  options: RenderOptions,
  bgColor: string,
): string {
  const positions = getFinderPositions(matrixSize);
  const finderColor = options.finderStyle.color.value;
  const parts: string[] = [];

  for (const pos of positions) {
    parts.push(
      buildSingleFinderElement(
        pos.col * px,
        pos.row * px,
        px,
        options.finderStyle.outerShape,
        options.finderStyle.innerShape,
        finderColor,
        bgColor,
      ),
    );
  }

  return parts.join('');
}

// --- Logo element ---

function buildLogoElement(options: RenderOptions, matrixSize: number, px: number): string {
  if (!options.logo) return '';

  const logoRect = calculateLogoRect(matrixSize, options.logo);
  const x = logoRect.col * px;
  const y = logoRect.row * px;
  const w = logoRect.width * px;
  const h = logoRect.height * px;

  return `<image href="${options.logo.src}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
}

// --- Main render function ---

export function renderSVG(options: RenderOptions): string {
  const dims = calculateDimensions(options);
  const { matrixSize, totalPx, pixelSize: px } = dims;

  // Optionally excavate logo zone
  let modules = options.matrix.modules;
  if (options.logo?.excavate) {
    const logoRect = calculateLogoRect(matrixSize, options.logo);
    modules = excavateLogoZone(modules, logoRect);
  }

  const parts: string[] = [];

  // SVG open tag
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalPx} ${totalPx}" width="${totalPx}" height="${totalPx}">`,
  );

  // Gradient defs (if needed)
  const qrAreaPx = matrixSize * px;
  const defs = buildGradientDefs(options.moduleStyle.color, qrAreaPx);
  if (defs) parts.push(defs);

  // Background
  const bgColor = options.background === 'transparent' ? 'none' : options.background.value;
  if (options.background !== 'transparent') {
    parts.push(`<rect x="0" y="0" width="${totalPx}" height="${totalPx}" fill="${bgColor}"/>`);
  }

  // Quiet zone group
  const qOffset = dims.quietZoneModules * px;
  parts.push(`<g transform="translate(${qOffset},${qOffset})">`);

  // Regular modules
  const fill = getFillRef(options.moduleStyle.color);
  parts.push(buildModuleElements(modules, matrixSize, px, fill, options.moduleStyle.shape));

  // Finder patterns
  parts.push(buildFinderElements(matrixSize, px, options, bgColor));

  // Logo
  parts.push(buildLogoElement(options, matrixSize, px));

  // Close tags
  parts.push('</g>');
  parts.push('</svg>');

  return parts.join('');
}
