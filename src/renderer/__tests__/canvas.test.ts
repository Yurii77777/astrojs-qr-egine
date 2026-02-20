import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { QRMatrix } from '@/engine/types';

import type { RenderOptions } from '../types';
import { renderCanvas } from '../canvas';

// Stub browser Image for Node.js test environment
beforeAll(() => {
  globalThis.Image = class {
    src = '';
    width = 0;
    height = 0;
  } as unknown as typeof Image;
});

afterAll(() => {
  delete (globalThis as Record<string, unknown>).Image;
});

// --- Mock CanvasRenderingContext2D ---

interface CallRecord {
  method: string;
  args: unknown[];
}

function createMockCtx(): { ctx: CanvasRenderingContext2D; calls: CallRecord[] } {
  const calls: CallRecord[] = [];

  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === 'fillStyle') return '';

      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        // Return a gradient-like object for gradient creation
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return { addColorStop: vi.fn() };
        }
      };
    },
    set(_target, prop: string, value: unknown) {
      calls.push({ method: `set:${prop}`, args: [value] });
      return true;
    },
  };

  const ctx = new Proxy({}, handler) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

function makeMatrix(size: number): QRMatrix {
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(true));
  const isFunction = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  return { size, version: 1, modules, isFunction };
}

function makeOptions(overrides: Partial<RenderOptions> = {}): RenderOptions {
  return {
    matrix: makeMatrix(21),
    moduleStyle: { shape: 'square', color: { type: 'solid', value: '#000000' } },
    finderStyle: {
      outerShape: 'square',
      innerShape: 'square',
      color: { type: 'solid', value: '#000000' },
    },
    background: { type: 'solid', value: '#ffffff' },
    quietZone: 4,
    pixelSize: 10,
    ...overrides,
  };
}

function getCallsByMethod(calls: CallRecord[], method: string): CallRecord[] {
  return calls.filter((c) => c.method === method);
}

describe('renderCanvas', () => {
  it('clears canvas before drawing', () => {
    const { ctx, calls } = createMockCtx();
    renderCanvas(makeOptions(), ctx);

    const clearCalls = getCallsByMethod(calls, 'clearRect');
    expect(clearCalls.length).toBeGreaterThanOrEqual(1);
    expect(clearCalls[0].args).toEqual([0, 0, 290, 290]); // (21+8)*10
  });

  it('draws background when not transparent', () => {
    const { ctx, calls } = createMockCtx();
    renderCanvas(makeOptions(), ctx);

    // Background fillRect should be called with full canvas size
    const fillRects = getCallsByMethod(calls, 'fillRect');
    const bgRect = fillRects.find((c) => {
      const [x, y, w, h] = c.args as number[];
      return x === 0 && y === 0 && w === 290 && h === 290;
    });
    expect(bgRect).toBeDefined();
  });

  it('skips background when transparent', () => {
    const { ctx, calls } = createMockCtx();
    renderCanvas(makeOptions({ background: 'transparent' }), ctx);

    // No background fillRect at (0,0,290,290) — only clearRect
    const fillRects = getCallsByMethod(calls, 'fillRect');
    const bgRect = fillRects.find((c) => {
      const [x, y, w, h] = c.args as number[];
      return x === 0 && y === 0 && w === 290 && h === 290;
    });
    expect(bgRect).toBeUndefined();
  });

  it('applies quiet zone via translate', () => {
    const { ctx, calls } = createMockCtx();
    renderCanvas(makeOptions(), ctx);

    const translateCalls = getCallsByMethod(calls, 'translate');
    expect(translateCalls.length).toBeGreaterThanOrEqual(1);
    expect(translateCalls[0].args).toEqual([40, 40]); // 4 * 10
  });

  it('calls save and restore', () => {
    const { ctx, calls } = createMockCtx();
    renderCanvas(makeOptions(), ctx);

    const saves = getCallsByMethod(calls, 'save');
    const restores = getCallsByMethod(calls, 'restore');
    expect(saves.length).toBe(1);
    expect(restores.length).toBe(1);
  });

  it('uses fillRect for square modules', () => {
    const { ctx, calls } = createMockCtx();
    renderCanvas(
      makeOptions({ moduleStyle: { shape: 'square', color: { type: 'solid', value: '#000' } } }),
      ctx,
    );

    const fillRects = getCallsByMethod(calls, 'fillRect');
    // Should have module fillRects (beyond background + finders)
    expect(fillRects.length).toBeGreaterThan(3);
  });

  it('uses roundRect for rounded modules', () => {
    const { ctx, calls } = createMockCtx();
    renderCanvas(
      makeOptions({ moduleStyle: { shape: 'rounded', color: { type: 'solid', value: '#000' } } }),
      ctx,
    );

    const roundRects = getCallsByMethod(calls, 'roundRect');
    expect(roundRects.length).toBeGreaterThan(0);
  });

  it('uses arc for circle modules', () => {
    const { ctx, calls } = createMockCtx();
    renderCanvas(
      makeOptions({ moduleStyle: { shape: 'circle', color: { type: 'solid', value: '#000' } } }),
      ctx,
    );

    const arcs = getCallsByMethod(calls, 'arc');
    expect(arcs.length).toBeGreaterThan(0);
  });

  it('uses moveTo+lineTo for diamond modules', () => {
    const { ctx, calls } = createMockCtx();
    renderCanvas(
      makeOptions({ moduleStyle: { shape: 'diamond', color: { type: 'solid', value: '#000' } } }),
      ctx,
    );

    const moveTos = getCallsByMethod(calls, 'moveTo');
    const lineTos = getCallsByMethod(calls, 'lineTo');
    expect(moveTos.length).toBeGreaterThan(0);
    expect(lineTos.length).toBeGreaterThan(0);
  });

  it('draws 3 finder patterns (multiple composite layers)', () => {
    const { ctx, calls } = createMockCtx();
    renderCanvas(makeOptions(), ctx);

    // Each finder = 3 layers = 3 fillRect calls for square finders
    // Total finder fillRects = 9 (3 finders × 3 layers)
    // Plus background fillRect + module fillRects
    const fillRects = getCallsByMethod(calls, 'fillRect');
    // At least 9 for finders + 1 for bg
    expect(fillRects.length).toBeGreaterThanOrEqual(10);
  });

  it('creates linear gradient once', () => {
    const { ctx, calls } = createMockCtx();
    const options = makeOptions({
      moduleStyle: {
        shape: 'square',
        color: {
          type: 'linear',
          angle: 45,
          stops: [
            { offset: 0, color: '#ff0000' },
            { offset: 1, color: '#0000ff' },
          ],
        },
      },
    });

    renderCanvas(options, ctx);

    const gradientCalls = getCallsByMethod(calls, 'createLinearGradient');
    expect(gradientCalls.length).toBe(1);
  });

  it('creates radial gradient once', () => {
    const { ctx, calls } = createMockCtx();
    const options = makeOptions({
      moduleStyle: {
        shape: 'square',
        color: {
          type: 'radial',
          stops: [
            { offset: 0, color: '#ff0000' },
            { offset: 1, color: '#0000ff' },
          ],
        },
      },
    });

    renderCanvas(options, ctx);

    const gradientCalls = getCallsByMethod(calls, 'createRadialGradient');
    expect(gradientCalls.length).toBe(1);
  });

  it('excavation reduces draw call count', () => {
    const { ctx: ctx1, calls: calls1 } = createMockCtx();
    renderCanvas(makeOptions(), ctx1);

    const { ctx: ctx2, calls: calls2 } = createMockCtx();
    renderCanvas(
      makeOptions({
        logo: { src: 'data:image/png;base64,abc', sizeRatio: 0.2, excavate: true },
      }),
      ctx2,
    );

    // Module draw calls should be fewer with excavation
    const moduleFills1 = getCallsByMethod(calls1, 'fillRect').length;
    const moduleFills2 = getCallsByMethod(calls2, 'fillRect').length;
    expect(moduleFills2).toBeLessThan(moduleFills1);
  });

  it('handles quietZone 0', () => {
    const { ctx, calls } = createMockCtx();
    renderCanvas(makeOptions({ quietZone: 0 }), ctx);

    const translateCalls = getCallsByMethod(calls, 'translate');
    expect(translateCalls[0].args).toEqual([0, 0]);
  });
});
