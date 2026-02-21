import { useEffect, useRef } from 'react';
import { renderCanvas } from '@/renderer';
import type { QRMatrix } from '@/engine/types';
import type { RenderOptions } from '@/renderer/types';

export function QRPreview({
  matrix,
  renderOptions,
  error,
}: {
  matrix: QRMatrix | null;
  renderOptions: Omit<RenderOptions, 'matrix'>;
  error: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!matrix || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const options: RenderOptions = { ...renderOptions, matrix };
    const dpr = window.devicePixelRatio || 1;
    const totalModules = matrix.size + 2 * renderOptions.quietZone;
    const totalPx = totalModules * renderOptions.pixelSize;

    canvas.width = totalPx * dpr;
    canvas.height = totalPx * dpr;
    canvas.style.width = `${totalPx}px`;
    canvas.style.height = `${totalPx}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderCanvas(options, ctx);
  }, [matrix, renderOptions]);

  if (error) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8">
        <p className="text-center text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!matrix) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 p-8">
        <p className="text-sm text-muted-foreground">Enter text to generate QR code</p>
      </div>
    );
  }

  return <canvas ref={canvasRef} className="max-w-full rounded-lg" />;
}
