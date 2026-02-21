import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';

const encoder = new TextEncoder();

export function DataInput({ onTextChange }: { onTextChange: (text: string) => void }) {
  const [localText, setLocalText] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onTextChange(localText);
    }, 150);
    return () => clearTimeout(timer);
  }, [localText, onTextChange]);

  const byteCount = encoder.encode(localText).length;

  return (
    <div className="space-y-2">
      <Label htmlFor="qr-data">Data</Label>
      <textarea
        id="qr-data"
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        placeholder="https://example.com"
        rows={3}
        className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{localText.length} characters</span>
        <span>{byteCount} bytes</span>
      </div>
    </div>
  );
}
