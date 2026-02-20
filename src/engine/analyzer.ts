import type { AnalyzerResult, Mode, QROptions } from './types';
import {
  ALPHANUM_CHARSET,
  EC_TABLE,
  MODE_INDICATOR,
  SIZE_CLASS_RANGE,
  getCharCountBits,
} from './tables';

const textEncoder = new TextEncoder();

function detectMode(text: string): Mode {
  if (/^\d+$/.test(text)) return 'Numeric';
  if ([...text].every((ch) => ALPHANUM_CHARSET.includes(ch))) return 'Alphanumeric';
  return 'Byte';
}

function getDataBitCount(text: string, mode: Mode): number {
  switch (mode) {
    case 'Numeric': {
      const len = text.length;
      const fullGroups = Math.floor(len / 3);
      const remainder = len % 3;
      return fullGroups * 10 + (remainder === 2 ? 7 : remainder === 1 ? 4 : 0);
    }
    case 'Alphanumeric': {
      const len = text.length;
      const pairs = Math.floor(len / 2);
      const odd = len % 2;
      return pairs * 11 + odd * 6;
    }
    case 'Byte':
      return textEncoder.encode(text).length * 8;
  }
}

function hasNonLatin1(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 255) return true;
  }
  return false;
}

export function analyze(text: string, options: QROptions): AnalyzerResult {
  const mode = detectMode(text);
  const { ecLevel, sizeClass, minVersion } = options;
  const [rangeMin, rangeMax] = SIZE_CLASS_RANGE[sizeClass];
  const startVersion = Math.max(rangeMin, minVersion ?? 1);

  const dataBits = getDataBitCount(text, mode);
  const needsECI = mode === 'Byte' && hasNonLatin1(text);
  const eciOverhead = needsECI ? 4 + 8 : 0; // ECI mode indicator + designator

  for (let v = startVersion; v <= rangeMax; v++) {
    const countBits = getCharCountBits(mode, v);
    const modeIndicatorBits = 4;

    let charCount: number;
    if (mode === 'Byte') {
      charCount = textEncoder.encode(text).length;
    } else {
      charCount = text.length;
    }

    const totalBits = eciOverhead + modeIndicatorBits + countBits + dataBits;
    const capacity = EC_TABLE[v][ecLevel].totalDataBytes * 8;

    if (totalBits <= capacity) {
      const dataBytes = textEncoder.encode(text);

      return {
        text,
        mode,
        version: v,
        ecLevel,
        dataBytes,
        charCount,
      };
    }
  }

  throw new Error(`Payload too large for size class ${sizeClass} with EC level ${ecLevel}`);
}

export { detectMode, getDataBitCount, MODE_INDICATOR };
