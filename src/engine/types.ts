export type Mode = 'Numeric' | 'Alphanumeric' | 'Byte';
export type ECLevel = 'L' | 'M' | 'Q' | 'H';
export type SizeClass = 'S' | 'M' | 'L';

export interface AnalyzerResult {
  text: string;
  mode: Mode;
  version: number;
  ecLevel: ECLevel;
  dataBytes: Uint8Array;
  charCount: number;
}

export interface QROptions {
  ecLevel: ECLevel;
  sizeClass: SizeClass;
  minVersion?: number;
}

export interface QRMatrix {
  size: number;
  version: number;
  modules: boolean[][];
  isFunction: boolean[][];
}
