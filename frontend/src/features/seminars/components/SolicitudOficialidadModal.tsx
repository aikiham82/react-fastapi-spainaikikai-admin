import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useInitiateSeminarOfficialidadMutation } from '../hooks/mutations/useInitiateSeminarOficialidad.mutation';
import { formatCurrency } from '@/features/price-configurations/data/schemas/price-configuration.schema';

interface SolicitudOficialidadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seminarId: string;
  seminarTitle: string;
  price: number | null; // null if price not yet loaded
}

export const SolicitudOficialidadModal = ({
  open,
  onOpenChange,
  seminarId,
  seminarTitle,
  price,
}: SolicitudOficialidadModalProps) => {
  const mutation = useInitiateSeminarOfficialidadMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear error when modal opens/closes
  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      mutation.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = () => {
    setErrorMessage(null);
    mutation.mutate(seminarId, {
      onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
        const detail = error.response?.data?.detail || 'Error al iniciar el pago. Inténtalo de nuevo.';
        setErrorMessage(detail);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Solicitar Oficialidad</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            Al solicitar la oficialidad, el seminario{' '}
            <span className="font-medium text-gray-900">{seminarTitle}</span>{' '}
            será avalado por Spain Aikikai y se mostrará con el sello oficial.
          </p>

          {price !== null && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
              <p className="text-sm text-amber-700 mb-1">Precio de oficialidad</p>
              <p className="text-3xl font-bold text-amber-800">
                {formatCurrency(price)}
              </p>
            </div>
          )}

          {price === null && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Cargando precio...</p>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={mutation.isPending || price === null}
            className="cursor-pointer"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              'Confirmar pago'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
