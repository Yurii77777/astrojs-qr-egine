import { gfMul } from './gf256';
import { getGenerator } from './generators';

export function rsEncode(data: Uint8Array, nEC: number): Uint8Array {
  const generator = getGenerator(nEC);
  const buf = new Uint8Array(data.length + nEC);
  buf.set(data);

  for (let i = 0; i < data.length; i++) {
    const coef = buf[i];
    if (coef !== 0) {
      for (let j = 0; j < generator.length; j++) {
        buf[i + j] ^= gfMul(generator[j], coef);
      }
    }
  }

  return buf.slice(data.length);
}
