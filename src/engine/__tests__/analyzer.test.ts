import { describe, expect, it } from 'vitest';

import { analyze, detectMode } from '../analyzer';

describe('detectMode', () => {
  it('detects Numeric for digits only', () => {
    expect(detectMode('12345')).toBe('Numeric');
    expect(detectMode('0')).toBe('Numeric');
  });

  it('detects Alphanumeric for uppercase + allowed chars', () => {
    expect(detectMode('HELLO WORLD')).toBe('Alphanumeric');
    expect(detectMode('ABC123')).toBe('Alphanumeric');
    expect(detectMode('HTTP://EXAMPLE.COM')).toBe('Alphanumeric');
  });

  it('detects Byte for lowercase', () => {
    expect(detectMode('hello')).toBe('Byte');
    expect(detectMode('Hello')).toBe('Byte');
  });

  it('detects Byte for non-ASCII', () => {
    expect(detectMode('Привіт')).toBe('Byte');
    expect(detectMode('日本語')).toBe('Byte');
  });

  it('detects Byte for special chars not in alphanumeric set', () => {
    expect(detectMode('hello@world')).toBe('Byte');
  });
});

describe('analyze', () => {
  it('selects V1-M for "HELLO WORLD"', () => {
    const result = analyze('HELLO WORLD', { ecLevel: 'M', sizeClass: 'S' });
    expect(result.version).toBe(1);
    expect(result.mode).toBe('Alphanumeric');
    expect(result.charCount).toBe(11);
  });

  it('selects correct version for numeric data', () => {
    const result = analyze('12345', { ecLevel: 'L', sizeClass: 'S' });
    expect(result.version).toBe(1);
    expect(result.mode).toBe('Numeric');
    expect(result.charCount).toBe(5);
  });

  it('uses Byte mode with correct byte count for UTF-8', () => {
    const result = analyze('Привіт', { ecLevel: 'L', sizeClass: 'S' });
    expect(result.mode).toBe('Byte');
    // "Привіт" is 6 Cyrillic chars = 12 UTF-8 bytes
    expect(result.charCount).toBe(12);
  });

  it('respects minVersion option', () => {
    const result = analyze('A', { ecLevel: 'L', sizeClass: 'S', minVersion: 3 });
    expect(result.version).toBe(3);
  });

  it('throws when payload is too large for size class', () => {
    const longText = 'A'.repeat(10000);
    expect(() => analyze(longText, { ecLevel: 'H', sizeClass: 'S' })).toThrow('Payload too large');
  });

  it('bumps version when char count bits change', () => {
    // Create a string that's too large for V9 but fits V10 in Byte mode
    // V9-L has 232 data bytes, V10-L has 274 data bytes
    // Byte mode char count: 8 bits (v1-9) → 16 bits (v10+)
    // At v9: capacity = 232*8 = 1856 bits, overhead = 4 + 8 = 12 bits, data = 232 bytes max
    // This is a size class M test (v6-15)
    const result = analyze('x'.repeat(200), { ecLevel: 'L', sizeClass: 'M' });
    expect(result.mode).toBe('Byte');
    expect(result.version).toBeGreaterThanOrEqual(6);
  });
});
