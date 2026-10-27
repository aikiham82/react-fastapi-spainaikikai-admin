import { Link } from 'react-router-dom';
import { Clock, CreditCard, Euro, MapPin, Users, XCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarStack, IconTile, ProgressBar, ProgressRing } from '@/components/ui/graphic';
import { usePermissions } from '@/core/hooks/usePermissions';
import { parseUtcDateTime } from '@/core/utils/format';
import { cn } from '@/lib/utils';
import { useDashboardDataQuery } from '../hooks/queries/useDashboardData.query';
import type { DashboardData, UpcomingSeminar } from '../data/schemas/dashboard.schema';

type Tone = 'bad' | 'warn' | 'brand';

interface AttentionItem {
  key: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  detail?: string;
  names?: string[];
  to: string;
  action: string;
  primary?: boolean;
}

const cardClasses = 'rounded-[18px] bg-card shadow-card';

const plural = (count: number, singular: string, pluralForm: string) => (count === 1 ? singular : pluralForm);

const buildAttention = (data: DashboardData, isSuperAdmin: boolean): AttentionItem[] => {
  const { stats, expiring_licenses: expiring } = data;
  const items: AttentionItem[] = [];

  if (stats.expired_licenses > 0) {
    items.push({
      key: 'expired',
      icon: XCircle,
      tone: 'bad',
      title: `${stats.expired_licenses} ${plural(stats.expired_licenses, 'licencia caducada', 'licencias caducadas')}`,
      to: '/licenses?estado=caducadas',
      action: 'Ver',
    });
  }

  if (expiring.length > 0) {
    items.push({
      key: 'expiring',
      icon: Clock,
      tone: 'warn',
      title: `${expiring.length} ${plural(expiring.length, 'licencia que caduca', 'licencias que caducan')} en los próximos 30 días`,
      names: expiring.map((license) => license.member_name),
      to: '/licenses?estado=caducan-pronto',
      action: 'Ver',
    });
  }

  if (stats.clubs_pending > 0) {
    items.push(
      isSuperAdmin
        ? {
            key: 'pending',
            icon: Euro,
            tone: 'brand',
            title: `${stats.clubs_pending} ${plural(stats.clubs_pending, 'club sin pagar', 'clubs sin pagar')} la temporada`,
            to: '/payments?tab=historial',
            action: 'Ver',
          }
        : {
            key: 'pending',
            icon: Euro,
            tone: 'brand',
            title: 'Falta pagar la temporada',
            detail: 'Licencias, seguros y cuota del club',
            to: '/payments',
            action: 'Pagar',
            primary: true,
          }
    );
  }

  return items;
};

const AttentionRow = ({ item }: { item: AttentionItem }) => (
  <Link
    to={item.to}
    className={cn(cardClasses, 'flex items-center gap-4 p-3.5 transition-shadow hover:shadow-md sm:px-4')}
  >
    <IconTile icon={item.icon} tone={item.tone} />
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] font-semibold leading-snug text-foreground">{item.title}</span>
      {item.names && (
        <span className="mt-1.5 block">
          <AvatarStack names={item.names} />
          <span className="sr-only">{item.names.join(', ')}</span>
        </span>
      )}
      {item.detail && <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{item.detail}</span>}
    </span>
    <span
      aria-hidden="true"
      className={buttonVariants({ variant: item.primary ? 'default' : 'outline', className: 'pointer-events-none' })}
    >
      {item.action}
    </span>
  </Link>
);

const KpiCard = ({ children }: { children: ReactNode }) => <div className={cn(cardClasses, 'p-4')}>{children}</div>;

const BigNumber = ({ value, max }: { value: number; max: number }) => (
  <p className="text-[26px] font-bold leading-none tabular-nums text-foreground">
    {value} <span className="text-base font-medium text-muted-foreground">/ {max}</span>
  </p>
);

const SeminarCard = ({ seminar }: { seminar: UpcomingSeminar }) => {
  const date = parseUtcDateTime(seminar.date);
  const day = date ? String(date.getDate()) : '';
  const month = date ? date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase() : '';
  const hasCapacity = seminar.max_participants > 0;

  return (
    <Link to="/seminars" className={cn(cardClasses, 'flex flex-col gap-4 p-4 transition-shadow hover:shadow-md')}>
      <h3 className="text-[17px] font-semibold text-foreground">Próximo seminario</h3>
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-[72px] shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
        >
          <span className="text-center leading-tight">
            <span className="block text-2xl font-bold">{day}</span>
            <span className="block text-xs font-semibold tracking-wide">{month}</span>
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold leading-snug text-foreground">{seminar.title}</span>
          <span className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{seminar.location}</span>
          </span>
        </span>
      </div>
      {hasCapacity && (
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-4" aria-hidden="true" />
              {seminar.participants} de {seminar.max_participants} plazas
            </span>
            <span className="font-semibold text-foreground">
              {Math.min(100, Math.round((seminar.participants / seminar.max_participants) * 100))}%
            </span>
          </span>
          <ProgressBar value={seminar.participants} max={seminar.max_participants} label="Plazas ocupadas" tone="brand" />
        </div>
      )}
    </Link>
  );
};

const RingKpi = ({ value, max, label }: { value: number; max: number; label: string }) => (
  <KpiCard>
    <div className="flex items-center gap-4">
      <ProgressRing value={value} max={max} label={label} tone={value / Math.max(max, 1) >= 0.75 ? 'ok' : 'warn'} />
      <div className="min-w-0">
        <BigNumber value={value} max={max} />
        <p className="mt-1.5 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  </KpiCard>
);

export const Dashboard = () => {
  const { data, isLoading, error, refetch } = useDashboardDataQuery();
  const { canAccess, isAssociationAdmin } = usePermissions();
  const isSuperAdmin = isAssociationAdmin();

  if (isLoading) {
    return (
      <div className="flex max-w-5xl flex-col gap-3" aria-busy="true">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-28 w-full rounded-[18px]" />
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-[72px] w-full rounded-[18px]" />
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
  const canPay = canAccess({ resource: 'payments', action: 'create' });
  const canAddMember = canAccess({ resource: 'members', action: 'create' });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Hola</h2>
          {isSuperAdmin && (
            <p className="mt-1 text-[15px] text-muted-foreground">
              {stats.total_clubs} clubs · {stats.total_members} miembros, {stats.active_members} activos
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:flex sm:flex-row-reverse">
          {canPay && (
            <Button size="lg" className="shadow-card" asChild>
              <Link to="/payments">
                <CreditCard className="size-5" aria-hidden="true" />
                Pagar temporada
              </Link>
            </Button>
          )}
          {canAddMember && (
            <Button size="lg" variant="outline" asChild>
              <Link to="/members">Añadir miembro</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <RingKpi value={stats.licensed_members ?? 0} max={stats.active_members} label="Licencias al día" />
        <RingKpi value={stats.insured_members ?? 0} max={stats.active_members} label="Con seguro de accidentes" />
        <KpiCard>
          <div className="flex items-start justify-between gap-3">
            <BigNumber value={stats.clubs_paid} max={stats.total_clubs} />
            {stats.clubs_pending > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
                <Clock className="size-3.5" aria-hidden="true" />
                {stats.clubs_pending} sin pagar
              </span>
            )}
          </div>
          <div className="mt-3">
            <ProgressBar value={stats.clubs_paid} max={stats.total_clubs} label="Temporada pagada" tone="ok" />
          </div>
          <p className="mt-2.5 text-sm text-muted-foreground">
            {isSuperAdmin ? 'Clubs con la temporada pagada' : 'Temporada pagada'}
          </p>
        </KpiCard>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-3">
          <h3 className="text-[17px] font-semibold text-foreground">Necesita atención</h3>
          {attention.map((item) => (
            <AttentionRow key={item.key} item={item} />
          ))}
          {attention.length === 0 && <p className={cn(cardClasses, 'p-5 text-[15px] text-foreground')}>Todo al día.</p>}
        </section>
        {nextSeminar && <SeminarCard seminar={nextSeminar} />}
      </div>
    </div>
  );
};
