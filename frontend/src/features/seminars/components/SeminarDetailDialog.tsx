import { resolveApiUrl } from '@/core/data/apiClient';
import { DetailField } from '@/components/ui/detail-field';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDateTime } from '@/core/utils/format';
import type { Seminar } from '../data/schemas/seminar.schema';
import { OfficialBadge } from './OfficialBadge';
import { STATUS_LABELS, STATUS_TONES } from '../utils/seminarStatus';

interface SeminarDetailDialogProps {
  seminar: Seminar | null;
  onClose: () => void;
  canRequestOficialidad: boolean;
  isProcessing: boolean;
  onRequestOficialidad: (seminar: Seminar) => void;
}

export const SeminarDetailDialog = ({
  seminar,
  onClose,
  canRequestOficialidad,
  isProcessing,
  onRequestOficialidad,
}: SeminarDetailDialogProps) => {
  const registered = seminar
    ? seminar.max_participants
      ? `${seminar.current_participants} de ${seminar.max_participants}`
      : String(seminar.current_participants)
    : '';

  return (
    <Dialog open={!!seminar} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {seminar && (
          <>
            <DialogHeader>
              <DialogTitle>{seminar.title}</DialogTitle>
              <DialogDescription>{seminar.description || 'Sin descripción'}</DialogDescription>
            </DialogHeader>

            {seminar.cover_image_url && (
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                {seminar.is_official && <OfficialBadge />}
                <img
                  src={resolveApiUrl(seminar.cover_image_url)}
                  alt={seminar.title}
                  className="size-full object-cover"
                />
              </div>
            )}

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailField label="Estado">
                <StatusBadge tone={STATUS_TONES[seminar.status]}>{STATUS_LABELS[seminar.status] ?? seminar.status}</StatusBadge>
              </DetailField>
              <DetailField label="Inscritos">{registered}</DetailField>
              <DetailField label="Empieza">{formatDateTime(seminar.start_date)}</DetailField>
              <DetailField label="Termina">{formatDateTime(seminar.end_date)}</DetailField>
              <DetailField label="Lugar">{seminar.venue || '-'}</DetailField>
              <DetailField label="Ciudad">{[seminar.city, seminar.province].filter(Boolean).join(', ') || '-'}</DetailField>
              {seminar.address && <DetailField label="Dirección">{seminar.address}</DetailField>}
              {seminar.instructor_name && <DetailField label="Instructor">{seminar.instructor_name}</DetailField>}
              <DetailField label="Precio">{formatCurrency(seminar.price)}</DetailField>
              {seminar.is_official && <DetailField label="Oficialidad">Avalado por Spain Aikikai</DetailField>}
            </dl>

            {(canRequestOficialidad || isProcessing) && (
              <DialogFooter>
                {isProcessing ? (
                  <Button variant="outline" disabled aria-live="polite">
                    <Loader2 className="size-4 animate-spin" />
                    Procesando pago...
                  </Button>
                ) : (
                  <Button onClick={() => onRequestOficialidad(seminar)}>Solicitar oficialidad</Button>
                )}
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
