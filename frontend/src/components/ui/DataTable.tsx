import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataTableProps {
  columns: {
    header: string;
    key: string;
    cell?: (row: any) => ReactNode;
  }[];
  data: any[];
  emptyMessage?: string;
  isLoading?: boolean;
}

export const DataTable = ({ columns, data, emptyMessage = 'No hay datos', isLoading = false }: DataTableProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((column) => (
                <th key={column.key} className="text-left p-4 font-medium text-gray-900">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={`${row.id}-${index}`} className="border-b hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.key} className="p-4">
                    {column.cell ? column.cell(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
