import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ECLevel } from '@/engine/types';

const EC_OPTIONS: { value: ECLevel; label: string; description: string }[] = [
  { value: 'L', label: 'L', description: '~7%' },
  { value: 'M', label: 'M', description: '~15%' },
  { value: 'Q', label: 'Q', description: '~25%' },
  { value: 'H', label: 'H', description: '~30%' },
];

export function ECLevelSelector({
  value,
  onChange,
}: {
  value: ECLevel;
  onChange: (level: ECLevel) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Error Correction</Label>
      <div className="grid grid-cols-4 gap-2">
        {EC_OPTIONS.map((option) => (
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
