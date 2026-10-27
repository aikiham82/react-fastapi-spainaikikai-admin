import { BadgeCheck, Clock, Loader2, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ProgressBar } from '@/components/ui/graphic';
import { RowActions } from '@/components/ui/list-controls';
import { formatCurrency } from '@/core/utils/format';
import { cn } from '@/lib/utils';
import type { Seminar } from '../data/schemas/seminar.schema';
import { STATUS_ICONS, STATUS_LABELS, STATUS_TONES, displayStatus, seatsTone } from '../utils/seminarStatus';
import { dateBlock, startTimeLabel } from '../utils/seminarDates';

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

const lineIcon = 'size-[18px] shrink-0 text-muted-foreground';

const Seats = ({ taken, max }: { taken: number; max?: number }) => {
  if (!max) {
    return (
      <span className="flex items-center gap-1.5">
        <Users className={lineIcon} aria-hidden="true" />
        <span>{`${taken} inscritos`}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <Users className={lineIcon} aria-hidden="true" />
      <span className="whitespace-nowrap">{`${taken} de ${max} plazas`}</span>
      <span className="w-20 shrink-0 sm:w-24">
        <ProgressBar value={Math.min(taken, max)} max={max} label="Plazas ocupadas" tone={seatsTone(taken, max)} />
      </span>
    </span>
  );
};

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
  const place = [seminar.venue, seminar.city].filter(Boolean).join(', ');
  const status = displayStatus(seminar);
  const isQuiet = status === 'completed' || status === 'cancelled';

  return (
    <li
      data-testid="seminar-row"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] bg-card p-3 shadow-card sm:p-4"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver detalles de ${seminar.title}`}
        className="flex min-w-0 flex-1 basis-72 items-start gap-4 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          data-testid="seminar-date-block"
          aria-hidden="true"
          className={cn(
            'flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl leading-none',
            isQuiet ? 'bg-primary-soft text-primary' : 'bg-primary text-primary-foreground'
          )}
        >
          <span className="text-2xl font-bold">{day}</span>
          <span className="mt-1 text-[11px] font-bold uppercase tracking-wide">{month}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-foreground">{seminar.title}</span>
            {seminar.is_official && (
              <StatusBadge tone="ok" icon={BadgeCheck}>
                Oficial
              </StatusBadge>
            )}
          </span>
          {place && (
            <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className={lineIcon} aria-hidden="true" />
              <span className="truncate">{place}</span>
            </span>
          )}
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <Seats taken={seminar.current_participants} max={seminar.max_participants} />
            {time && (
              <span className="flex items-center gap-1.5">
                <Clock className={lineIcon} aria-hidden="true" />
                {time}
              </span>
            )}
            {seminar.instructor_name && <span className="truncate">{seminar.instructor_name}</span>}
          </span>
        </span>
      </button>

      <div className="flex w-full flex-wrap items-center gap-2 pl-[72px] sm:ml-auto sm:w-auto sm:justify-end sm:pl-0">
        <span className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(seminar.price)}</span>
        <StatusBadge tone={STATUS_TONES[status]} icon={STATUS_ICONS[status]}>
          {STATUS_LABELS[status]}
        </StatusBadge>
        {isProcessing ? (
          <Button variant="outline" disabled aria-live="polite" className="pointer-coarse:h-11">
            <Loader2 className="size-4 animate-spin" />
            Procesando...
          </Button>
        ) : (
          canRequestOficialidad && (
            <Button variant="outline" onClick={onRequestOficialidad} className="pointer-coarse:h-11">
              <BadgeCheck className="size-4" aria-hidden="true" />
              Solicitar oficialidad
            </Button>
          )
        )}
        {actions.length > 0 && (
          <span className="ml-auto sm:ml-0">
            <RowActions label={seminar.title} actions={actions} />
          </span>
        )}
      </div>
    </li>
  );
};
