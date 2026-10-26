import { Checkbox } from '@/components/ui/checkbox';
import type { ColumnOption } from '../data/importExportConfig';

interface ColumnSelectorProps {
  columns: ColumnOption[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
}

export function ColumnSelector({ columns, selectedKeys, onChange }: ColumnSelectorProps) {
  const allSelected = selectedKeys.length === columns.length;
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
        <button
          type="button"
          onClick={() => onChange(columns.map((c) => c.key))}
          disabled={allSelected}
          className="min-h-8 text-foreground underline underline-offset-4 disabled:text-muted-foreground disabled:no-underline"
        >
          Marcar todas
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={noneSelected}
          className="min-h-8 text-foreground underline underline-offset-4 disabled:text-muted-foreground disabled:no-underline"
        >
          Quitar todas
        </button>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {columns.map((col) => (
          <label key={col.key} className="flex min-h-8 cursor-pointer items-center gap-2 text-sm text-foreground">
            <Checkbox checked={selectedKeys.includes(col.key)} onCheckedChange={() => toggleColumn(col.key)} />
            {col.label}
          </label>
        ))}
      </div>
      {noneSelected && <p className="text-sm text-danger">Marca al menos una columna para poder descargar.</p>}
    </fieldset>
  );
}
