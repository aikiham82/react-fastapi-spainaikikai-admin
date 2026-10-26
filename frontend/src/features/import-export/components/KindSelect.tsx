import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KIND_CONFIG, type ImportExportKind } from '../data/importExportConfig';

interface KindSelectProps {
  id: string;
  label: string;
  kinds: ImportExportKind[];
  value: ImportExportKind;
  onChange: (kind: ImportExportKind) => void;
}

export function KindSelect({ id, label, kinds, value, onChange }: KindSelectProps) {
  if (kinds.length === 1) {
    return <p className="text-sm text-muted-foreground">Miembros de tu club</p>;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as ImportExportKind)}>
        <SelectTrigger id={id} className="w-full sm:max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {kinds.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {KIND_CONFIG[kind].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
