import { describe, expect, it } from 'vitest';

import type { QRMatrix } from '@/engine/types';

import type { RenderOptions } from '../types';
import { renderSVG } from '../svg';

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

describe('renderSVG', () => {
  it('produces valid SVG with correct viewBox', () => {
    const svg = renderSVG(makeOptions());

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 290 290"');
    expect(svg).toContain('width="290"');
    expect(svg).toContain('height="290"');
    expect(svg).toContain('</svg>');
  });

  it('includes background rect when not transparent', () => {
    const svg = renderSVG(makeOptions());

    expect(svg).toContain('<rect x="0" y="0" width="290" height="290" fill="#ffffff"/>');
  });

  it('omits background rect when transparent', () => {
    const svg = renderSVG(makeOptions({ background: 'transparent' }));

    expect(svg).not.toContain('fill="#ffffff"');
    // Should not have the full-size background rect
    expect(svg).not.toMatch(/rect x="0" y="0" width="290" height="290"/);
  });

  it('applies quiet zone via g transform', () => {
    const svg = renderSVG(makeOptions());

    expect(svg).toContain('<g transform="translate(40,40)">');
  });

  it('handles quietZone 0 with translate(0,0)', () => {
    const svg = renderSVG(makeOptions({ quietZone: 0 }));

    expect(svg).toContain('<g transform="translate(0,0)">');
  });

  it('uses rect elements for square modules', () => {
    const svg = renderSVG(makeOptions());

    // Module rects should not have rx attribute (no rounding)
    // Find module rects (not background, not finders)
    const moduleRectPattern = /rect x="\d+" y="\d+" width="10" height="10" fill="#000000"/;
    expect(svg).toMatch(moduleRectPattern);
  });

  it('uses rect with rx for rounded modules', () => {
    const svg = renderSVG(
      makeOptions({
        moduleStyle: { shape: 'rounded', color: { type: 'solid', value: '#000000' } },
      }),
    );

    // Rounded modules should have rx attribute
    expect(svg).toMatch(/rect x="\d+" y="\d+" width="10" height="10" rx="3" fill="#000000"/);
  });

  it('uses circle elements for circle modules', () => {
    const svg = renderSVG(
      makeOptions({
        moduleStyle: { shape: 'circle', color: { type: 'solid', value: '#000000' } },
      }),
    );

    expect(svg).toMatch(/circle cx="\d+" cy="\d+" r="5" fill="#000000"/);
  });

  it('uses polygon elements for diamond modules', () => {
    const svg = renderSVG(
      makeOptions({
        moduleStyle: { shape: 'diamond', color: { type: 'solid', value: '#000000' } },
      }),
    );

    expect(svg).toMatch(/polygon points="[^"]+" fill="#000000"/);
  });

  it('includes linear gradient defs with userSpaceOnUse', () => {
    const svg = renderSVG(
      makeOptions({
        moduleStyle: {
          shape: 'square',
          color: {
            type: 'linear',
            angle: 90,
            stops: [
              { offset: 0, color: '#ff0000' },
              { offset: 1, color: '#0000ff' },
            ],
          },
        },
      }),
    );

    expect(svg).toContain('<defs>');
    expect(svg).toContain('gradientUnits="userSpaceOnUse"');
    expect(svg).toContain('<linearGradient id="mg"');
    expect(svg).toContain('stop-color="#ff0000"');
    expect(svg).toContain('stop-color="#0000ff"');
    // Modules should reference the gradient
    expect(svg).toContain('fill="url(#mg)"');
  });

  it('includes radial gradient defs with userSpaceOnUse', () => {
    const svg = renderSVG(
      makeOptions({
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
      }),
    );

    expect(svg).toContain('<radialGradient id="mg"');
    expect(svg).toContain('gradientUnits="userSpaceOnUse"');
  });

  it('uses integer coordinates (no decimals)', () => {
    const svg = renderSVG(makeOptions());

    // Check that x, y, width, height values in rects are integers
    const rectMatches = svg.matchAll(
      /rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g,
    );
    for (const match of rectMatches) {
      expect(Number(match[1]) % 1).toBe(0);
      expect(Number(match[2]) % 1).toBe(0);
      expect(Number(match[3]) % 1).toBe(0);
      expect(Number(match[4]) % 1).toBe(0);
    }
  });

  it('includes logo image element with data URL href', () => {
    const dataUrl = 'data:image/png;base64,iVBOR';
    const svg = renderSVG(
      makeOptions({
        logo: { src: dataUrl, sizeRatio: 0.2, excavate: false },
      }),
    );

    expect(svg).toContain(`<image href="${dataUrl}"`);
    expect(svg).toMatch(/image href="[^"]+" x="\d+" y="\d+" width="\d+" height="\d+"/);
  });

  it('draws finder composites (3 finders × 3 layers = 9 rects for square style)', () => {
    const svg = renderSVG(makeOptions());

    // Count finder-sized rects: 7*10=70px outer, 5*10=50px ring, 3*10=30px center
    const outerRects = (svg.match(/width="70" height="70"/g) || []).length;
    const ringRects = (svg.match(/width="50" height="50"/g) || []).length;
    const centerRects = (svg.match(/width="30" height="30"/g) || []).length;

    expect(outerRects).toBe(3); // 3 finders
    expect(ringRects).toBe(3);
    expect(centerRects).toBe(3);
  });

  it('uses rounded finder outer shape when configured', () => {
    const svg = renderSVG(
      makeOptions({
        finderStyle: {
          outerShape: 'rounded',
          innerShape: 'square',
          color: { type: 'solid', value: '#000000' },
        },
      }),
    );

    // Outer and ring rects should have rx for rounded shape
    expect(svg).toMatch(/width="70" height="70" rx="14"/);
  });

  it('uses blob shape for finder center when configured', () => {
    const svg = renderSVG(
      makeOptions({
        finderStyle: {
          outerShape: 'square',
          innerShape: 'blob',
          color: { type: 'solid', value: '#000000' },
        },
      }),
    );

    // Blob centers should be path elements with bezier curves
    expect(svg).toMatch(/<path d="M[^"]+" fill="#000000"\/>/);
  });

  it('excavation removes modules in logo zone', () => {
    const svgWithout = renderSVG(makeOptions());
    const svgWith = renderSVG(
      makeOptions({
        logo: { src: 'data:image/png;base64,abc', sizeRatio: 0.2, excavate: true },
      }),
    );

    // Excavated SVG should have fewer module elements
    const moduleCountWithout = (svgWithout.match(/fill="#000000"\/>/g) || []).length;
    const moduleCountWith = (svgWith.match(/fill="#000000"\/>/g) || []).length;
    expect(moduleCountWith).toBeLessThan(moduleCountWithout);
  });
});
