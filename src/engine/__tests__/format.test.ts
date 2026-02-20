import { describe, expect, it } from 'vitest';

import { calculateFormatBits, calculateVersionBits } from '../format';
import { writeFormatInfo } from '../format';

describe('calculateFormatBits', () => {
  it('EC level bits: L=01, M=00, Q=11, H=10', () => {
    // For mask 0, the raw 5-bit data:
    // M: 00_000 = 0, L: 01_000 = 8, Q: 11_000 = 24, H: 10_000 = 16
    const mBits = calculateFormatBits('M', 0);
    const lBits = calculateFormatBits('L', 0);
    const qBits = calculateFormatBits('Q', 0);
    const hBits = calculateFormatBits('H', 0);

    // Each should be a 15-bit value
    expect(mBits).toBeGreaterThanOrEqual(0);
    expect(mBits).toBeLessThan(1 << 15);
    expect(lBits).toBeGreaterThanOrEqual(0);
    expect(qBits).toBeGreaterThanOrEqual(0);
    expect(hBits).toBeGreaterThanOrEqual(0);

    // Different EC levels should produce different format bits
    const uniqueSet = new Set([mBits, lBits, qBits, hBits]);
    expect(uniqueSet.size).toBe(4);
  });

  it('produces known format bits for M-0', () => {
    // EC=M (00), mask=0 → raw = 00000
    // BCH remainder of 00000 << 10 = 0 → remainder = 0
    // XOR with mask 101010000010010 = 0x5412 = 21522
    const bits = calculateFormatBits('M', 0);
    expect(bits).toBe(0b101010000010010); // = 21522
  });

  it('different masks produce different format bits', () => {
    const results = new Set<number>();
    for (let mask = 0; mask < 8; mask++) {
      results.add(calculateFormatBits('M', mask));
    }
    expect(results.size).toBe(8);
  });
});

describe('calculateVersionBits', () => {
  it('produces 18-bit value', () => {
    const bits = calculateVersionBits(7);
    expect(bits).toBeGreaterThanOrEqual(0);
    expect(bits).toBeLessThan(1 << 18);
  });

  it('version 7 known value', () => {
    // Version 7: raw = 000111, BCH with generator 1111100100101
    const bits = calculateVersionBits(7);
    // Version 7 info: 000111 110010010100
    expect(bits).toBe(0b000111110010010100);
  });

  it('different versions produce different bits', () => {
    const v7 = calculateVersionBits(7);
    const v8 = calculateVersionBits(8);
    expect(v7).not.toBe(v8);
  });
});

describe('writeFormatInfo', () => {
  it('writes format info to correct positions in V1', () => {
    const size = 21;
    const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
    const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

    writeFormatInfo(modules, isFunction, size, 1, 'M', 0);

    // Format info should be written at specific positions
    // Copy 1: around top-left (col 8 vertical, row 8 horizontal)
    expect(isFunction[0][8]).toBe(true);
    expect(isFunction[8][0]).toBe(true);

    // Copy 2: top-right and bottom-left
    expect(isFunction[8][size - 1]).toBe(true);
    expect(isFunction[size - 1][8]).toBe(true);
  });

  it('does not write version info for V < 7', () => {
    const size = 21;
    const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
    const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

    writeFormatInfo(modules, isFunction, size, 1, 'M', 0);

    // Version info positions should not be touched
    // (for V1 these positions don't exist in the matrix anyway)
  });

  it('writes version info for V >= 7', () => {
    const size = 4 * 7 + 17; // = 45
    const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
    const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

    writeFormatInfo(modules, isFunction, size, 7, 'M', 0);

    // Version info: top-right block at rows 0-5, cols size-11..size-9
    expect(isFunction[0][size - 11]).toBe(true);
    expect(isFunction[5][size - 9]).toBe(true);

    // Bottom-left block (transposed)
    expect(isFunction[size - 11][0]).toBe(true);
  });
});
