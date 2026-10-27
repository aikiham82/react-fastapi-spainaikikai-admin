import { Checkbox } from '@/components/ui/checkbox';
import { TextButton } from '@/components/ui/text-link';
import type { ColumnOption } from '../data/importExportConfig';

interface ColumnSelectorProps {
  columns: ColumnOption[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
}

export function ColumnSelector({ columns, selectedKeys, onChange }: ColumnSelectorProps) {
  const noneSelected = selectedKeys.length === 0;

  const toggleColumn = (key: string) => {
    onChange(
      selectedKeys.includes(key) ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key]
    );
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-foreground">Elegir columnas</legend>
      <div className="flex items-center gap-4 text-sm">
        <TextButton variant="inline"
          onClick={() => onChange(columns.map((c) => c.key))}
        >
          Marcar todas
        </TextButton>
        <TextButton variant="inline"
          onClick={() => onChange([])}
        >
          Quitar todas
        </TextButton>
      </div>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        {columns.map((col) => (
          <label key={col.key} className="flex min-h-11 w-full cursor-pointer items-center gap-3 text-sm text-foreground">
            <Checkbox className="size-5" checked={selectedKeys.includes(col.key)} onCheckedChange={() => toggleColumn(col.key)} />
            {col.label}
          </label>
        ))}
      </div>
      {noneSelected && <p className="text-sm text-danger">Marca al menos una columna para poder descargar.</p>}
    </fieldset>
  );
}
