import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { SizeClass } from '@/engine/types';

const SIZE_OPTIONS: { value: SizeClass; label: string; description: string }[] = [
  { value: 'S', label: 'S', description: 'V1–9 · Short text' },
  { value: 'M', label: 'M', description: 'V10–26 · General use' },
  { value: 'L', label: 'L', description: 'V27–40 · Large data' },
];

export function SizeSelector({
  value,
  onChange,
}: {
  value: SizeClass;
  onChange: (size: SizeClass) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Size</Label>
      <div className="grid grid-cols-3 gap-2">
        {SIZE_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(option.value)}
            className="h-auto flex-col py-2"
          >
            <span className="font-semibold">{option.label}</span>
            <span className="text-[10px] font-normal opacity-70">{option.description}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
