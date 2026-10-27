import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ApiError } from '@/core/data/apiClient';
import { formatCurrency } from '@/core/utils/format';
import { useSeminarOfficialidadPriceQuery } from '../hooks/queries/useSeminarPriceQuery';
import { useInitiateSeminarOfficialidadMutation } from '../hooks/mutations/useInitiateSeminarOficialidad.mutation';

interface SolicitudOficialidadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seminarId: string;
  seminarTitle: string;
}

export const SolicitudOficialidadModal = ({
  open,
  onOpenChange,
  seminarId,
  seminarTitle,
}: SolicitudOficialidadModalProps) => {
  const mutation = useInitiateSeminarOfficialidadMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const priceQuery = useSeminarOfficialidadPriceQuery(open);
  const price = priceQuery.data?.price ?? null;
  const priceFailed = priceQuery.isError;

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
      onError: (error) => {
        const detail = (error as unknown as ApiError).detail || 'No se pudo iniciar el pago. Inténtalo de nuevo.';
        setErrorMessage(detail);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Solicitar oficialidad</DialogTitle>
          <DialogDescription>
            El seminario <span className="font-medium text-foreground">{seminarTitle}</span> será avalado por Spain
            Aikikai y se mostrará con el sello oficial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {price !== null && (
            <div className="border-y border-border py-4">
              <p className="text-sm text-muted-foreground">Precio de oficialidad</p>
              <p className="text-3xl font-semibold tabular-nums text-foreground">{formatCurrency(price)}</p>
            </div>
          )}

          {price === null && !priceFailed && (
            <div className="flex items-center gap-2 border-y border-border py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando precio...
            </div>
          )}

          {price === null && priceFailed && (
            <div role="alert" className="space-y-3 border-y border-border py-4">
              <div>
                <p className="text-sm text-danger">No se pudo cargar el precio.</p>
                <p className="text-sm text-muted-foreground">Inténtalo más tarde o escribe a la Federación.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => priceQuery.refetch()}
                  disabled={priceQuery.isFetching}
                >
                  Reintentar
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">
              {errorMessage}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={mutation.isPending || price === null}>
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
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
