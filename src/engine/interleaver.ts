import type { ECLevel } from './types';
import { EC_TABLE, getRemainderBits } from './tables';
import { rsEncode } from './rs';

function expandByte(byte: number, bits: Uint8Array, offset: number): void {
  for (let bit = 7; bit >= 0; bit--) {
    bits[offset + (7 - bit)] = (byte >>> bit) & 1;
  }
}

function bytesToBits(bytes: number[], bits: Uint8Array, startIdx: number): number {
  let idx = startIdx;
  for (const byte of bytes) {
    expandByte(byte, bits, idx);
    idx += 8;
  }
  return idx;
}

function collectColumn(blocks: Uint8Array[], col: number): number[] {
  const values: number[] = [];
  for (const block of blocks) {
    if (col < block.length) {
      values.push(block[col]);
    }
  }
  return values;
}

function interleaveColumns(blocks: Uint8Array[], maxLen: number): number[] {
  const result: number[] = [];
  for (let col = 0; col < maxLen; col++) {
    result.push(...collectColumn(blocks, col));
  }
  return result;
}

export function interleave(
  dataCodewords: Uint8Array,
  version: number,
  ecLevel: ECLevel,
): Uint8Array {
  const entry = EC_TABLE[version][ecLevel];
  const { group1, group2 } = entry;
  const ecBytes = group1.ecBytes;

  // Split data into blocks
  const blocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < group1.count; i++) {
    blocks.push(dataCodewords.slice(offset, offset + group1.dataBytes));
    offset += group1.dataBytes;
  }
  if (group2) {
    for (let i = 0; i < group2.count; i++) {
      blocks.push(dataCodewords.slice(offset, offset + group2.dataBytes));
      offset += group2.dataBytes;
    }
  }

  // RS-encode each block
  const ecBlocks: Uint8Array[] = blocks.map((block) => rsEncode(block, ecBytes));

  // Column-wise interleave
  const maxDataLen = group2 ? group2.dataBytes : group1.dataBytes;
  const interleavedData = interleaveColumns(blocks, maxDataLen);
  const interleavedEC = interleaveColumns(ecBlocks, ecBytes);

  // Convert to bit stream
  const totalBytes = interleavedData.length + interleavedEC.length;
  const remainderBitCount = getRemainderBits(version);
  const bits = new Uint8Array(totalBytes * 8 + remainderBitCount);

  const afterData = bytesToBits(interleavedData, bits, 0);
  bytesToBits(interleavedEC, bits, afterData);
  // Remainder bits are already 0 (Uint8Array default)

  return bits;
}
