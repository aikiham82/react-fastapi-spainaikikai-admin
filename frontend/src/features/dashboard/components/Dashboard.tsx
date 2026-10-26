import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/core/hooks/usePermissions';
import { formatDate } from '@/core/utils/format';
import { cn } from '@/lib/utils';
import { useDashboardDataQuery } from '../hooks/queries/useDashboardData.query';
import type { DashboardData } from '../data/schemas/dashboard.schema';

type Tone = 'bad' | 'warn' | 'neutral';

interface AttentionItem {
  key: string;
  lead: ReactNode;
  count?: number;
  tone: Tone;
  title: string;
  detail?: string;
  to: string;
  action: string;
}

const toneClasses: Record<Tone, string> = {
  bad: 'text-danger',
  warn: 'text-warning',
  neutral: 'text-foreground',
};

const namesPreview = (names: string[]): string => {
  const shown = names.slice(0, 2).join(', ');
  return names.length > 2 ? `${shown} y ${names.length - 2} más` : shown;
};

const plural = (count: number, singular: string, pluralForm: string) => (count === 1 ? singular : pluralForm);

const buildAttention = (data: DashboardData, isSuperAdmin: boolean): AttentionItem[] => {
  const { stats, expiring_licenses: expiring } = data;
  const items: AttentionItem[] = [];

  if (stats.expired_licenses > 0) {
    items.push({
      key: 'expired',
      lead: stats.expired_licenses,
      count: stats.expired_licenses,
      tone: 'bad',
      title: plural(stats.expired_licenses, 'Licencia caducada', 'Licencias caducadas'),
      to: '/licenses?estado=caducadas',
      action: 'Ver',
    });
  }

  if (expiring.length > 0) {
    items.push({
      key: 'expiring',
      lead: expiring.length,
      count: expiring.length,
      tone: 'warn',
      title: `${plural(expiring.length, 'Licencia que caduca', 'Licencias que caducan')} en los próximos 30 días`,
      detail: namesPreview(expiring.map((license) => license.member_name)),
      to: '/licenses?estado=caducan-pronto',
      action: 'Ver',
    });
  }

  if (stats.clubs_pending > 0) {
    items.push(
      isSuperAdmin
        ? {
            key: 'pending',
            lead: stats.clubs_pending,
            count: stats.clubs_pending,
            tone: 'neutral',
            title: `${plural(stats.clubs_pending, 'Club sin pagar', 'Clubs sin pagar')} la temporada`,
            to: '/club-payments',
            action: 'Ver',
          }
        : {
            key: 'pending',
            lead: '€',
            tone: 'neutral',
            title: 'Falta pagar la temporada',
            detail: 'Licencias, seguros y cuota del club',
            to: '/annual-payments',
            action: 'Pagar',
          }
    );
  }

  return items;
};

const AttentionRow = ({ item }: { item: AttentionItem }) => (
  <Link
    to={item.to}
    className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-1 py-4 transition-colors hover:bg-muted/60 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]"
  >
    <span aria-hidden="true" className={cn('text-[22px] font-semibold tabular-nums', toneClasses[item.tone])}>
      {item.lead}
    </span>
    <span className="min-w-0">
      <span className="block text-[15px] text-foreground">
        {item.count !== undefined && <span className="sr-only">{item.count} </span>}
        {item.title}
      </span>
      {item.detail && <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{item.detail}</span>}
    </span>
    <span className="text-sm text-muted-foreground" aria-hidden="true">
      {item.action} →
    </span>
  </Link>
);

export const Dashboard = () => {
  const { data, isLoading, error, refetch } = useDashboardDataQuery();
  const { canAccess, isAssociationAdmin } = usePermissions();
  const isSuperAdmin = isAssociationAdmin();

  if (isLoading) {
    return (
      <div className="flex max-w-3xl flex-col gap-3" aria-busy="true">
        <Skeleton className="h-8 w-72" />
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex max-w-3xl flex-col items-start gap-4">
        <p className="text-[15px] text-foreground">No hemos podido cargar el resumen.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const attention = buildAttention(data, isSuperAdmin);
  const nextSeminar = data.upcoming_seminars[0];
  const { stats } = data;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Lo que necesita tu atención</h2>
        {isSuperAdmin && (
          <p className="mt-1 text-[15px] text-muted-foreground">
            {stats.total_clubs} clubs · {stats.total_members} miembros, {stats.active_members} activos
          </p>
        )}
      </div>

      <div className="border-t border-border">
        {attention.map((item) => (
          <AttentionRow key={item.key} item={item} />
        ))}
        {attention.length === 0 && (
          <p className="border-b border-border px-1 py-5 text-[15px] text-foreground">Todo al día.</p>
        )}
        {nextSeminar && (
          <AttentionRow
            item={{
              key: 'seminar',
              lead: <span className="text-[15px] font-medium">{formatDate(nextSeminar.date).slice(0, 5)}</span>,
              tone: 'neutral',
              title: `Próximo seminario: ${nextSeminar.title}`,
              detail: `${formatDate(nextSeminar.date)} · ${nextSeminar.location}`,
              to: '/seminars',
              action: 'Ver',
            }}
          />
        )}
      </div>

      <div className="grid gap-3 sm:flex">
        {canAccess({ resource: 'payments', action: 'create' }) && (
          <Button size="lg" asChild>
            <Link to="/annual-payments">Pagar licencias y seguros</Link>
          </Button>
        )}
        {canAccess({ resource: 'members', action: 'create' }) && (
          <Button size="lg" variant="outline" asChild>
            <Link to="/members">Añadir miembro</Link>
          </Button>
        )}
      </div>
    </div>
  );
};
