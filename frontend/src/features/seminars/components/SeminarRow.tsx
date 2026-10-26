import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { RowActions } from '@/components/ui/list-controls';
import { formatCurrency } from '@/core/utils/format';
import type { Seminar } from '../data/schemas/seminar.schema';
import { STATUS_LABELS, STATUS_TONES } from '../utils/seminarStatus';
import { dateBlock, freeSpots, startTimeLabel } from '../utils/seminarDates';

interface RowAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

interface SeminarRowProps {
  seminar: Seminar;
  canRequestOficialidad: boolean;
  isProcessing: boolean;
  actions: RowAction[];
  onOpen: () => void;
  onRequestOficialidad: () => void;
}

export const SeminarRow = ({
  seminar,
  canRequestOficialidad,
  isProcessing,
  actions,
  onOpen,
  onRequestOficialidad,
}: SeminarRowProps) => {
  const { day, month } = dateBlock(seminar.start_date);
  const time = startTimeLabel(seminar.start_date);
  const spots = freeSpots(seminar);
  const place = [seminar.venue, seminar.city].filter(Boolean).join(', ');
  const secondary = [seminar.instructor_name, place].filter(Boolean).join(' · ');

  return (
    <li data-testid="seminar-row" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-3">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver detalles de ${seminar.title}`}
        className="flex min-h-14 min-w-0 flex-1 basis-64 items-center gap-4 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex w-12 shrink-0 flex-col items-center leading-tight" aria-hidden="true">
          <span className="text-xl font-semibold tabular-nums text-foreground">{day}</span>
          <span className="text-xs uppercase text-muted-foreground">{month}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-foreground">{seminar.title}</span>
            {seminar.is_official && <StatusBadge tone="ok">Oficial</StatusBadge>}
          </span>
          {secondary && <span className="mt-0.5 block truncate text-sm text-muted-foreground">{secondary}</span>}
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {[time, spots !== null ? `${spots} ${spots === 1 ? 'plaza libre' : 'plazas libres'}` : null, formatCurrency(seminar.price)]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
      </button>

      <div className="flex items-center gap-2">
        <StatusBadge tone={STATUS_TONES[seminar.status]}>{STATUS_LABELS[seminar.status] ?? seminar.status}</StatusBadge>
        {isProcessing ? (
          <Button variant="outline" disabled aria-live="polite">
            <Loader2 className="size-4 animate-spin" />
            Procesando...
          </Button>
        ) : (
          canRequestOficialidad && (
            <Button variant="outline" onClick={onRequestOficialidad}>
              Solicitar oficialidad
            </Button>
          )
        )}
        {actions.length > 0 && <RowActions label={seminar.title} actions={actions} />}
      </div>
    </li>
  );
};
