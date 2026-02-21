import { useMemo, useState } from 'react';
import { generateQR } from '@/engine';
import type { ECLevel, QRMatrix, SizeClass } from '@/engine/types';
import type { RenderOptions } from '@/renderer/types';
import { QRPreview } from './QRPreview';
import { DataInput } from './QRControls/DataInput';
import { SizeSelector } from './QRControls/SizeSelector';
import { ECLevelSelector } from './QRControls/ECLevelSelector';
import { ExportPanel } from './QRControls/ExportPanel';

const DEFAULT_RENDER_OPTIONS: Omit<RenderOptions, 'matrix'> = {
  moduleStyle: {
    shape: 'square',
    color: { type: 'solid', value: '#000000' },
  },
  finderStyle: {
    outerShape: 'square',
    innerShape: 'square',
    color: { type: 'solid', value: '#000000' },
  },
  background: { type: 'solid', value: '#ffffff' },
  quietZone: 4,
  pixelSize: 6,
};

export function QRApp() {
  const [text, setText] = useState('');
  const [sizeClass, setSizeClass] = useState<SizeClass>('M');
  const [ecLevel, setEcLevel] = useState<ECLevel>('M');

  const { matrix, error } = useMemo<{ matrix: QRMatrix | null; error: string | null }>(() => {
    if (!text) return { matrix: null, error: null };
    try {
      return { matrix: generateQR(text, { ecLevel, sizeClass }), error: null };
    } catch (e) {
      return {
        matrix: null,
        error: e instanceof Error ? e.message : 'QR generation failed',
      };
    }
  }, [text, ecLevel, sizeClass]);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="space-y-6">
        <DataInput onTextChange={setText} />
        <SizeSelector value={sizeClass} onChange={setSizeClass} />
        <ECLevelSelector value={ecLevel} onChange={setEcLevel} />
        <ExportPanel matrix={matrix} renderOptions={DEFAULT_RENDER_OPTIONS} />
      </div>
      <div className="flex items-start justify-center">
        <QRPreview matrix={matrix} renderOptions={DEFAULT_RENDER_OPTIONS} error={error} />
      </div>
    </div>
  );
}
