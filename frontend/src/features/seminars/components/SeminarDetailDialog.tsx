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

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 text-[15px] text-foreground">{children}</dd>
  </div>
);

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
                  src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}${seminar.cover_image_url}`}
                  alt={seminar.title}
                  className="size-full object-cover"
                />
              </div>
            )}

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Estado">
                <StatusBadge tone={STATUS_TONES[seminar.status]}>{STATUS_LABELS[seminar.status] ?? seminar.status}</StatusBadge>
              </Field>
              <Field label="Inscritos">{registered}</Field>
              <Field label="Empieza">{formatDateTime(seminar.start_date)}</Field>
              <Field label="Termina">{formatDateTime(seminar.end_date)}</Field>
              <Field label="Lugar">{seminar.venue || '-'}</Field>
              <Field label="Ciudad">{[seminar.city, seminar.province].filter(Boolean).join(', ') || '-'}</Field>
              {seminar.address && <Field label="Dirección">{seminar.address}</Field>}
              {seminar.instructor_name && <Field label="Instructor">{seminar.instructor_name}</Field>}
              <Field label="Precio">{formatCurrency(seminar.price)}</Field>
              {seminar.is_official && <Field label="Oficialidad">Avalado por Spain Aikikai</Field>}
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
