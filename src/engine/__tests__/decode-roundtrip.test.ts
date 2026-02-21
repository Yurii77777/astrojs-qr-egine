import { describe, expect, it } from 'vitest';
import decodeQR from '@paulmillr/qr/decode.js';
import { generateQR } from '../index';
import type { QRMatrix } from '../types';

/**
 * Convert QR matrix to RGBA pixel array for decoder.
 * Adds quiet zone, renders black (dark) / white (light) modules.
 */
function matrixToRGBA(
  matrix: QRMatrix,
  quietZone = 4,
  scale = 10,
): { data: Uint8Array; width: number; height: number } {
  const totalModules = matrix.size + 2 * quietZone;
  const totalPx = totalModules * scale;
  const data = new Uint8Array(totalPx * totalPx * 4);

  // Fill all white first
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255; // R
    data[i + 1] = 255; // G
    data[i + 2] = 255; // B
    data[i + 3] = 255; // A
  }

  // Draw dark modules as black (scaled)
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (matrix.modules[row][col]) {
        fillScaledPixel(data, totalPx, (row + quietZone) * scale, (col + quietZone) * scale, scale);
      }
    }
  }

  return { data, width: totalPx, height: totalPx };
}

function fillScaledPixel(
  data: Uint8Array,
  stride: number,
  y: number,
  x: number,
  scale: number,
): void {
  for (let dy = 0; dy < scale; dy++) {
    for (let dx = 0; dx < scale; dx++) {
      const px = ((y + dy) * stride + (x + dx)) * 4;
      data[px] = 0;
      data[px + 1] = 0;
      data[px + 2] = 0;
    }
  }
}

describe('QR decode roundtrip', () => {
  it('HELLO WORLD (V1-M, Alphanumeric)', () => {
    const matrix = generateQR('HELLO WORLD', { ecLevel: 'M', sizeClass: 'S' });
    const pixels = matrixToRGBA(matrix);
    const decoded = decodeQR(pixels);
    expect(decoded).toBe('HELLO WORLD');
  });

  it('1234567890 (Numeric)', () => {
    const matrix = generateQR('1234567890', { ecLevel: 'M', sizeClass: 'S' });
    const pixels = matrixToRGBA(matrix);
    const decoded = decodeQR(pixels);
    expect(decoded).toBe('1234567890');
  });

  it('https://example.com (Byte)', () => {
    const matrix = generateQR('https://example.com', { ecLevel: 'M', sizeClass: 'S' });
    const pixels = matrixToRGBA(matrix);
    const decoded = decodeQR(pixels);
    expect(decoded).toBe('https://example.com');
  });

  it('https://magic-weblab.com.ua/en (Byte)', () => {
    const matrix = generateQR('https://magic-weblab.com.ua/en', { ecLevel: 'M', sizeClass: 'M' });
    const pixels = matrixToRGBA(matrix);
    const decoded = decodeQR(pixels);
    expect(decoded).toBe('https://magic-weblab.com.ua/en');
  });
});
