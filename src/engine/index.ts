import type { QRMatrix, QROptions } from './types';
import { analyze } from './analyzer';
import { encode } from './encoder';
import { writeFormatInfo } from './format';
import { interleave } from './interleaver';
import { evaluateMasks } from './masker';
import { createMatrix } from './matrix';
import { placeData } from './placer';

export function generateQR(text: string, options: QROptions): QRMatrix {
  // 1. Analyze: detect mode, select version
  const analysis = analyze(text, options);

  // 2. Encode: create padded data codewords
  const dataCodewords = encode(analysis);

  // 3. Interleave: RS encode, split blocks, interleave, produce bit stream
  const bits = interleave(dataCodewords, analysis.version, analysis.ecLevel);

  // 4. Build matrix: place function patterns, reserve format/version zones
  const matrixState = createMatrix(analysis.version);

  // 5. Place data: zigzag placement of bit stream
  placeData(matrixState, bits);

  // 6. Evaluate masks: try all 8, pick lowest penalty
  const { maskIndex, modules } = evaluateMasks(
    matrixState.modules as boolean[][],
    matrixState.isFunction,
  );

  // 7. Write format & version info
  const isFunction = matrixState.isFunction;
  writeFormatInfo(
    modules,
    isFunction,
    matrixState.size,
    analysis.version,
    analysis.ecLevel,
    maskIndex,
  );

  return {
    size: matrixState.size,
    version: analysis.version,
    modules,
    isFunction,
  };
}

export type { AnalyzerResult, ECLevel, Mode, QRMatrix, QROptions, SizeClass } from './types';
