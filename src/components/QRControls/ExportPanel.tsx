import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { renderCanvas } from '@/renderer/canvas';
import { renderSVG } from '@/renderer/svg';
import type { QRMatrix } from '@/engine/types';
import type { RenderOptions } from '@/renderer/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const PNG_SIZES = [256, 512, 1024] as const;
type PNGSize = (typeof PNG_SIZES)[number];

// --- Export helpers ---

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPNG(
  matrix: QRMatrix,
  renderOptions: Omit<RenderOptions, 'matrix'>,
  targetPx: number,
): void {
  const pixelSize = Math.floor(targetPx / (matrix.size + 2 * renderOptions.quietZone));
  const options: RenderOptions = { ...renderOptions, matrix, pixelSize };

  const totalModules = matrix.size + 2 * renderOptions.quietZone;
  const totalPx = totalModules * pixelSize;

  const canvas = document.createElement('canvas');
  canvas.width = totalPx;
  canvas.height = totalPx;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  renderCanvas(options, ctx);

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `qr-${totalPx}px.png`);
  }, 'image/png');
}

function exportSVG(matrix: QRMatrix, renderOptions: Omit<RenderOptions, 'matrix'>): void {
  const options: RenderOptions = { ...renderOptions, matrix };
  const svgString = renderSVG(options);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  downloadBlob(blob, 'qr.svg');
}

async function copySVG(
  matrix: QRMatrix,
  renderOptions: Omit<RenderOptions, 'matrix'>,
): Promise<void> {
  const options: RenderOptions = { ...renderOptions, matrix };
  const svgString = renderSVG(options);
  await navigator.clipboard.writeText(svgString);
}

// --- Component ---

export function ExportPanel({
  matrix,
  renderOptions,
}: {
  matrix: QRMatrix | null;
  renderOptions: Omit<RenderOptions, 'matrix'>;
}) {
  const [pngSize, setPngSize] = useState<PNGSize>(512);
  const [copied, setCopied] = useState(false);

  const disabled = matrix === null;

  function handleExportPNG() {
    if (!matrix) return;
    exportPNG(matrix, renderOptions, pngSize);
  }

  function handleExportSVG() {
    if (!matrix) return;
    exportSVG(matrix, renderOptions);
  }

  async function handleCopySVG() {
    if (!matrix) return;
    await copySVG(matrix, renderOptions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <Label>Export</Label>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          {PNG_SIZES.map((size) => (
            <Button
              key={size}
              variant={pngSize === size ? 'default' : 'outline'}
              size="xs"
              onClick={() => setPngSize(size)}
            >
              {size}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={disabled} onClick={handleExportPNG}>
            <Download size={16} strokeWidth={2} aria-hidden="true" />
            PNG {pngSize}
          </Button>

          <Button variant="outline" size="sm" disabled={disabled} onClick={handleExportSVG}>
            <Download size={16} strokeWidth={2} aria-hidden="true" />
            SVG
          </Button>

          <Button variant="outline" size="sm" disabled={disabled} onClick={handleCopySVG}>
            {copied ? (
              <Check size={16} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Copy size={16} strokeWidth={2} aria-hidden="true" />
            )}
            {copied ? 'Copied' : 'Copy SVG'}
          </Button>
        </div>
      </div>
    </div>
  );
}
