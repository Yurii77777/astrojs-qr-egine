import { describe, expect, it } from 'vitest';

import { generateQR } from '../index';

describe('generateQR', () => {
  it('generates V1 21×21 QR for "HELLO WORLD" M', () => {
    const result = generateQR('HELLO WORLD', { ecLevel: 'M', sizeClass: 'S' });

    expect(result.version).toBe(1);
    expect(result.size).toBe(21);
    expect(result.modules.length).toBe(21);
    expect(result.modules[0].length).toBe(21);
  });

  it('matrix is fully populated (no null modules)', () => {
    const result = generateQR('HELLO WORLD', { ecLevel: 'M', sizeClass: 'S' });

    for (let r = 0; r < result.size; r++) {
      for (let c = 0; c < result.size; c++) {
        expect(result.modules[r][c]).not.toBeNull();
        expect(typeof result.modules[r][c]).toBe('boolean');
      }
    }
  });

  it('finder patterns are in place', () => {
    const result = generateQR('HELLO WORLD', { ecLevel: 'M', sizeClass: 'S' });
    const { modules, size } = result;

    // Top-left finder pattern corners
    expect(modules[0][0]).toBe(true);
    expect(modules[0][6]).toBe(true);
    expect(modules[6][0]).toBe(true);
    expect(modules[6][6]).toBe(true);
    // White ring
    expect(modules[1][1]).toBe(false);

    // Top-right finder
    expect(modules[0][size - 1]).toBe(true);
    expect(modules[0][size - 7]).toBe(true);

    // Bottom-left finder
    expect(modules[size - 1][0]).toBe(true);
    expect(modules[size - 7][0]).toBe(true);
  });

  it('dark module at (13, 8) for V1', () => {
    const result = generateQR('HELLO WORLD', { ecLevel: 'M', sizeClass: 'S' });
    // Dark module: row = 4*version+9 = 13, col = 8
    expect(result.modules[13][8]).toBe(true);
    expect(result.isFunction[13][8]).toBe(true);
  });

  it('handles Numeric mode', () => {
    const result = generateQR('0123456789', { ecLevel: 'L', sizeClass: 'S' });
    expect(result.version).toBe(1);
    expect(result.size).toBe(21);
  });

  it('handles Byte mode (ASCII)', () => {
    const result = generateQR('hello world', { ecLevel: 'L', sizeClass: 'S' });
    expect(result.version).toBeGreaterThanOrEqual(1);
    expect(result.size).toBe(4 * result.version + 17);
  });

  it('handles Byte mode (UTF-8)', () => {
    const result = generateQR('Привіт', { ecLevel: 'L', sizeClass: 'S' });
    expect(result.version).toBeGreaterThanOrEqual(1);
    expect(result.size).toBe(4 * result.version + 17);
  });

  it('handles larger versions', () => {
    const longText = 'A'.repeat(100);
    const result = generateQR(longText, { ecLevel: 'M', sizeClass: 'M' });
    expect(result.version).toBeGreaterThanOrEqual(6);
    expect(result.version).toBeLessThanOrEqual(15);
  });

  it('throws for text too large for size class', () => {
    const hugeText = 'A'.repeat(10000);
    expect(() => generateQR(hugeText, { ecLevel: 'H', sizeClass: 'S' })).toThrow(
      'Payload too large',
    );
  });

  it('timing patterns are correct', () => {
    const result = generateQR('TEST', { ecLevel: 'L', sizeClass: 'S' });
    // Timing patterns at row 6 and col 6 alternate dark/light
    // Between separators (cols 8-12 for V1)
    expect(result.modules[6][8]).toBe(true); // even = dark
    expect(result.modules[6][10]).toBe(true);
    expect(result.modules[6][12]).toBe(true);
  });
});
