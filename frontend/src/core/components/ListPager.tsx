import { Button } from '@/components/ui/button';

interface ListPagerProps {
  total: number;
  limit: number;
  offset: number;
  noun: string;
  onPage: (offset: number) => void;
}

export const ListPager = ({ total, limit, offset, noun, onPage }: ListPagerProps) => {
  if (total === 0) return null;

  if (limit === 0) {
    return <p className="text-sm text-gray-600">{total} {noun}</p>;
  }

  if (total <= limit) return null;

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-sm text-gray-600">
        Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(Math.max(0, offset - limit))}
          disabled={currentPage === 1}
        >
          Anterior
        </Button>
        <span className="text-sm text-gray-600">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(offset + limit)}
          disabled={currentPage === totalPages}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
};
