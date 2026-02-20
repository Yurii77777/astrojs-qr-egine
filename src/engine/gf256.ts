// GF(256) with primitive polynomial 285 (0x11D)

export const EXP = new Uint8Array(512);
export const LOG = new Uint8Array(256);

let x = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x = x << 1;
  if (x >= 256) x ^= 285;
}
// Duplicate for index-free multiplication (sum of logs can reach 509)
for (let i = 255; i < 512; i++) {
  EXP[i] = EXP[i - 255];
}

export function gfAdd(a: number, b: number): number {
  return a ^ b;
}

export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

export function gfPow(a: number, n: number): number {
  if (n === 0) return 1;
  if (a === 0) return 0;
  return EXP[(LOG[a] * n) % 255];
}

export function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero in GF(256)');
  if (a === 0) return 0;
  return EXP[(LOG[a] + 255 - LOG[b]) % 255];
}
