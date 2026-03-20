import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight, Columns3 } from 'lucide-react';

export interface ColumnOption {
  key: string;
  label: string;
}

interface ColumnSelectorProps {
  columns: ColumnOption[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
}

export function ColumnSelector({ columns, selectedKeys, onChange }: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const allSelected = selectedKeys.length === columns.length;
  const noneSelected = selectedKeys.length === 0;

  const toggleColumn = (key: string) => {
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter((k) => k !== key));
    } else {
      onChange([...selectedKeys, key]);
    }
  };

  const selectAll = () => onChange(columns.map((c) => c.key));
  const selectNone = () => onChange([]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Columns3 className="w-4 h-4 text-gray-500" />
          <span>Columnas a exportar</span>
          <span className="ml-1 text-xs font-normal text-gray-500">
            ({selectedKeys.length} de {columns.length})
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={selectAll}
              disabled={allSelected}
              className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Todas
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={selectNone}
              disabled={noneSelected}
              className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Ninguna
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {columns.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-gray-900"
              >
                <Checkbox
                  checked={selectedKeys.includes(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                  className="h-3.5 w-3.5"
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
