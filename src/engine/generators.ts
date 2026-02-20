import { EXP, gfMul } from './gf256';

type Bytes = Uint8Array<ArrayBuffer>;

const cache = new Map<number, Bytes>();

/** Multiply polynomial by binomial (x - α^exp) in GF(256). */
function mulByBinomial(poly: Bytes, exp: number): Bytes {
  const factor = EXP[exp % 255];
  const result = new Uint8Array(poly.length + 1);

  for (let j = 0; j < poly.length; j++) {
    result[j] ^= poly[j];
    result[j + 1] ^= gfMul(poly[j], factor);
  }

  return result;
}

export function getGenerator(n: number): Bytes {
  const cached = cache.get(n);
  if (cached) return cached;

  let poly: Bytes = new Uint8Array([1]);
  for (let i = 0; i < n; i++) {
    poly = mulByBinomial(poly, i);
  }

  cache.set(n, poly);
  return poly;
}
