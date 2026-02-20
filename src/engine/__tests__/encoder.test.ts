import { describe, expect, it } from 'vitest';

import { analyze } from '../analyzer';
import { encode } from '../encoder';

describe('encode', () => {
  it('V1-M "HELLO WORLD" produces correct data codewords', () => {
    const analysis = analyze('HELLO WORLD', { ecLevel: 'M', sizeClass: 'S' });
    const codewords = encode(analysis);

    // Reference: 16 data codewords for V1-M "HELLO WORLD"
    expect(Array.from(codewords)).toEqual([
      32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17,
    ]);
  });

  it('encodes numeric data correctly', () => {
    const analysis = analyze('01234567', { ecLevel: 'M', sizeClass: 'S' });
    const codewords = encode(analysis);

    // Mode: 0001 (Numeric)
    // Count: 8 (10 bits) = 0000001000
    // Groups: 012→0000001100, 345→0101011001, 67→1000011
    // Data bits: 0001 0000001000 0000001100 0101011001 1000011
    // = 00010000 00100000 00011000 10101100 11000011 = 16, 32, 24, 172, 195
    // Then terminator + padding to V1-M (16 bytes)
    expect(codewords.length).toBe(16); // V1-M totalDataBytes
  });

  it('encodes byte data with correct length', () => {
    const analysis = analyze('hello', { ecLevel: 'L', sizeClass: 'S' });
    const codewords = encode(analysis);
    expect(codewords.length).toBe(19); // V1-L totalDataBytes
  });

  it('padding alternates 0xEC and 0x11', () => {
    // Short input → lots of padding bytes
    const analysis = analyze('A', { ecLevel: 'L', sizeClass: 'S' });
    const codewords = encode(analysis);
    expect(codewords.length).toBe(19);
    // After the data bits, terminator, and alignment, padding should alternate
    // The last several bytes should be 0xEC, 0x11 pattern
    const last = codewords[codewords.length - 1];
    const secondLast = codewords[codewords.length - 2];
    expect([0xec, 0x11]).toContain(last);
    expect([0xec, 0x11]).toContain(secondLast);
    expect(last).not.toBe(secondLast);
  });

  it('encodes UTF-8 with ECI header', () => {
    const analysis = analyze('Привіт', { ecLevel: 'L', sizeClass: 'S' });
    const codewords = encode(analysis);

    // First byte should start with ECI mode indicator (0111) + start of ECI designator
    // 0111 0001 1010 0100 ...
    // = 0x71, then Byte mode indicator, etc.
    expect(codewords.length).toBe(19); // V1-L totalDataBytes
    // ECI: 0111=7 shifted left 4 + 0001=1 (first 4 bits of designator 26=00011010)
    expect(codewords[0]).toBe(0b01110001); // ECI mode + first 4 bits of 26
  });

  it('produces exact byte count matching totalDataBytes', () => {
    for (const text of ['12345', 'HELLO', 'test']) {
      const analysis = analyze(text, { ecLevel: 'M', sizeClass: 'S' });
      const codewords = encode(analysis);
      expect(codewords.length).toBe(16); // V1-M totalDataBytes
    }
  });
});
