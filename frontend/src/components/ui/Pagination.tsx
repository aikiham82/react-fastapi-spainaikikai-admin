import { Button } from './button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
}

export const Pagination = ({ currentPage, totalPages, total, limit, offset, onPageChange }: PaginationProps) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(Math.max(0, offset - limit));
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(offset + limit);
    }
  };

  if (total <= limit) {
    return null;
  }

  const startIndex = offset + 1;
  const endIndex = Math.min(offset + limit, total);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-600">
        Mostrando {startIndex}-{endIndex} de {total} resultados
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-gray-600">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
