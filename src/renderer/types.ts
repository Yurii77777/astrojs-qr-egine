import type { QRMatrix } from '@/engine/types';

// --- Color types ---

export interface GradientStop {
  offset: number; // 0.0–1.0
  color: string; // '#rrggbb'
}

export interface SolidColor {
  type: 'solid';
  value: string; // '#rrggbb'
}

export interface LinearGradient {
  type: 'linear';
  angle: number; // CSS angle in degrees
  stops: [GradientStop, GradientStop];
}

export interface RadialGradient {
  type: 'radial';
  stops: [GradientStop, GradientStop];
}

export type ModuleColor = SolidColor | LinearGradient | RadialGradient;

// --- Module shapes ---

export type ModuleShape = 'square' | 'rounded' | 'circle' | 'diamond';

// --- Style interfaces ---

export interface ModuleStyle {
  shape: ModuleShape;
  color: ModuleColor;
}

export interface FinderStyle {
  outerShape: 'square' | 'rounded';
  innerShape: 'square' | 'rounded' | 'blob';
  color: SolidColor;
}

// --- Logo ---

export interface LogoConfig {
  src: string; // data URL
  sizeRatio: number; // 0.1–0.3
  excavate: boolean;
}

// --- Main input ---

export interface RenderOptions {
  matrix: QRMatrix;
  moduleStyle: ModuleStyle;
  finderStyle: FinderStyle;
  background: SolidColor | 'transparent';
  quietZone: 0 | 2 | 4 | 6;
  logo?: LogoConfig;
  pixelSize: number; // integer, px per module
}

// --- Internal helpers ---

export interface Dimensions {
  matrixSize: number;
  quietZoneModules: number;
  totalModules: number;
  totalPx: number;
  pixelSize: number;
}

export interface FinderPosition {
  row: number;
  col: number;
}

export type FinderLayer = 'outer' | 'ring' | 'center';

export interface LogoRect {
  row: number;
  col: number;
  width: number;
  height: number;
}
