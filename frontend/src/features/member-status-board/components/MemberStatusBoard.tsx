import { cn } from '@/lib/utils';
import { useMemo, useState, type ReactNode } from 'react';
import { Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ManualPaymentModal } from '@/features/club-payments/components/ManualPaymentModal';
import { useDeleteMemberPaymentMutation } from '@/features/club-payments/hooks/mutations/usePaymentAdminMutations';
import { useChangeMemberStatusMutation } from '@/features/members/hooks/mutations/useMemberMutations';
import { useUpdateInsuranceMutation } from '@/features/insurance/hooks/mutations/useInsuranceMutations';
import { useQueryClient } from '@tanstack/react-query';
import { ChipGroup, EmptyState, ListError, ListLoading, ListToolbar } from '@/components/ui/list-controls';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListPager } from '@/core/components/ListPager';
import { foldForSearch } from '@/core/utils/search';
import { defaultPaymentYear, seasonLabel } from '@/core/utils/defaultPaymentYear';
import { ClubFilterSelect } from '@/features/clubs/components/ClubFilterSelect';
import { LicenseStatusBadge } from '@/features/members/components/MemberBadges';
import { insurancePresentation } from '@/features/members/utils/member-attention';
import type { MemberStatusRow } from '../data/schemas/member-status.schema';
import { useMemberStatusBoardQuery } from '../hooks/queries/useMemberStatusBoardQuery';
import { useExportMemberStatusBoardMutation } from '../hooks/mutations/useExportMemberStatusBoardMutation';

const PAGE_SIZE = 50;
const NAME_COLLATOR = new Intl.Collator('es');

type Chip = 'all' | 'unpaid_in_force';

const fullName = (row: MemberStatusRow) => `${row.first_name} ${row.last_name}`.trim();

const licenceInForce = (row: MemberStatusRow) => row.license_summary?.status === 'active';

const unpaidInForce = (row: MemberStatusRow) => licenceInForce(row) && !row.license_paid;

function PaidBadge({ row }: { row: MemberStatusRow }) {
  if (row.license_paid) return <StatusBadge tone="ok">Pagada</StatusBadge>;
  return <StatusBadge tone={licenceInForce(row) ? 'warn' : 'neutral'}>Sin pagar</StatusBadge>;
}

interface TickProps {
  checked: boolean;
  label: string;
  disabled: boolean;
  lockedBecause?: string | null;
  showsWhyLocked?: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function Tick({ checked, label, disabled, lockedBecause = null, showsWhyLocked = false, onToggle, children }: TickProps) {
  return (
    <label
      className={cn('inline-flex min-h-11 items-center gap-2', !disabled && lockedBecause === null && 'cursor-pointer')}
      title={lockedBecause ?? undefined}
    >
      <Checkbox
        checked={checked}
        disabled={disabled || lockedBecause !== null}
        aria-label={label}
        className="size-5"
        onCheckedChange={onToggle}
      />
      <span className="flex flex-col gap-0.5">
        {children}
        {showsWhyLocked && lockedBecause && <span className="text-xs text-muted-foreground">{lockedBecause}</span>}
      </span>
    </label>
  );
}

const paidLock = (row: MemberStatusRow): string | null => {
  if (!row.club_id) return 'Sin club: el pago se apunta en un club';
  if (row.member_status !== 'active' && !row.license_paid) return 'De baja: no paga licencia';
  return null;
};

function MemberBadge({ status }: { status: string }) {
  return status === 'active'
    ? <StatusBadge tone="ok">Activo</StatusBadge>
    : <StatusBadge tone="neutral">De baja</StatusBadge>;
}

interface InsuranceKind {
  key: 'accident' | 'rc';
  header: string;
  name: string;
  item: string;
}

const INSURANCE_KINDS: InsuranceKind[] = [
  { key: 'accident', header: 'Accidentes', name: 'Seguro de accidentes', item: 'seguro_accidentes' },
  { key: 'rc', header: 'RC', name: 'Seguro RC', item: 'seguro_rc' },
];

const INSTRUCTOR_ITEMS = ['shidoin', 'fukushidoin'];

const insuranceOf = (row: MemberStatusRow, kind: InsuranceKind) => {
  const summary = row.insurance_summary;
  const [has, status, id, annulled, seasonPaid] = kind.key === 'accident'
    ? [summary?.has_accident, summary?.accident_status, row.accident_insurance_id, row.accident_insurance_annulled, row.accident_season_paid]
    : [summary?.has_rc, summary?.rc_status, row.rc_insurance_id, row.rc_insurance_annulled, row.rc_season_paid];
  return {
    has,
    status,
    id: id ?? null,
    annulled: Boolean(annulled),
    seasonPaid: Boolean(seasonPaid),
    inForce: Boolean(id) && !annulled,
  };
};

const insuranceLock = (row: MemberStatusRow, kind: InsuranceKind): string | null => {
  const { inForce, annulled, seasonPaid } = insuranceOf(row, kind);
  if (inForce || annulled) return null;
  if (row.member_status !== 'active') return 'De baja: no paga seguro';
  if (kind.key === 'rc' && INSTRUCTOR_ITEMS.includes(row.licence_item ?? '')) return 'Va incluido en su título';
  if (seasonPaid) return 'Ya está pagado esta temporada: revisa sus fechas en Seguros';
  if (!row.club_id) return 'Sin club: el pago se apunta en un club';
  return null;
};

interface Payment {
  row: MemberStatusRow;
  items: string[];
  year: number;
}

interface Confirmation {
  title: string;
  description: string;
  action: string;
  onConfirm: () => void;
}

function InsuranceBadge({ has, status }: { has?: boolean; status?: string | null }) {
  const { tone, label } = insurancePresentation(has ?? false, status) ?? { tone: 'neutral' as const, label: 'Sin seguro' };
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

interface Column {
  key: string;
  header: (year: number) => string;
  cell: (row: MemberStatusRow) => ReactNode;
}

export const MemberStatusBoard = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState('');
  const [clubId, setClubId] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isFetching, error } = useMemberStatusBoardQuery(year);
  const [paying, setPaying] = useState<Payment | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const setConfirming = (next: Confirmation) => {
    setConfirmation(next);
    setIsConfirming(true);
  };
  const { deleteMemberPayment, isLoading: isDeleting } = useDeleteMemberPaymentMutation();
  const changeMemberStatus = useChangeMemberStatusMutation();
  const exportBoard = useExportMemberStatusBoardMutation();
  const updateInsurance = useUpdateInsuranceMutation();
  const queryClient = useQueryClient();
  const busy = isDeleting || isFetching || changeMemberStatus.isPending || updateInsurance.isPending;

  const setAnnulled = (insuranceId: string, annulled: boolean) =>
    updateInsurance.mutate(
      { id: insuranceId, data: { annulled } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }) }
    );

  const toggleInsurance = (row: MemberStatusRow, kind: InsuranceKind) => {
    const { id, annulled, inForce } = insuranceOf(row, kind);
    if (id && annulled) return setAnnulled(id, false);
    if (!inForce || !id) return setPaying({ row, items: [kind.item], year: defaultPaymentYear(new Date()) });
    setConfirming({
      title: `¿Anular el ${kind.name.replace('Seguro', 'seguro')} de ${fullName(row)}?`,
      description: 'Deja de contar como vigente. Puedes volver a marcarlo para reactivarlo.',
      action: 'Anular seguro',
      onConfirm: () => setAnnulled(id, true),
    });
  };

  const togglePaid = (row: MemberStatusRow) => {
    const paymentId = row.license_payment_id;
    if (!row.license_paid || !paymentId) return setPaying({ row, items: row.licence_item ? [row.licence_item] : [], year });
    setConfirming({
      title: `¿Quitar el pago de la licencia ${year} de ${fullName(row)}?`,
      description: 'Se borrará este pago. La licencia seguirá en vigor hasta su fecha, pero aparecerá como sin pagar.',
      action: 'Quitar el pago',
      onConfirm: () => deleteMemberPayment(paymentId),
    });
  };

  const toggleMember = (row: MemberStatusRow) => {
    const active = row.member_status === 'active';
    setConfirming({
      title: active ? 'Dar de baja' : 'Reactivar miembro',
      description: active
        ? `Se dará de baja a "${fullName(row)}". El miembro quedará inactivo y será excluido de los pagos anuales. Esta acción es reversible.`
        : `Se reactivará a "${fullName(row)}". El miembro volverá a estar activo y será incluido en los pagos anuales.`,
      action: active ? 'Dar de baja' : 'Reactivar',
      onConfirm: () =>
        changeMemberStatus.mutate({ id: row.member_id, data: { status: active ? 'inactive' : 'active' } }),
    });
  };

  const columns: Column[] = [
    {
      key: 'paid',
      header: (forYear) => `Licencia ${forYear} pagada`,
      cell: (row) => (
        <Tick
          checked={row.license_paid}
          label={`Licencia ${year} pagada de ${fullName(row)}`}
          disabled={busy}
          lockedBecause={paidLock(row)}
          onToggle={() => togglePaid(row)}
        >
          <PaidBadge row={row} />
        </Tick>
      ),
    },
    {
      key: 'member',
      header: () => 'Miembro',
      cell: (row) => (
        <Tick
          checked={row.member_status === 'active'}
          label={`Miembro activo: ${fullName(row)}`}
          disabled={busy}
          onToggle={() => toggleMember(row)}
        >
          <MemberBadge status={row.member_status} />
        </Tick>
      ),
    },
    { key: 'licence', header: () => 'Licencia', cell: (row) => <LicenseStatusBadge licenseSummary={row.license_summary ?? undefined} /> },
    ...INSURANCE_KINDS.map((kind): Column => ({
      key: kind.key,
      header: () => kind.header,
      cell: (row) => {
        const { has, status, inForce } = insuranceOf(row, kind);
        return (
          <Tick
            checked={inForce}
            label={`${kind.name} de ${fullName(row)}`}
            disabled={busy}
            lockedBecause={insuranceLock(row, kind)}
            showsWhyLocked={row.member_status === 'active'}
            onToggle={() => toggleInsurance(row, kind)}
          >
            <InsuranceBadge has={has} status={status} />
          </Tick>
        );
      },
    })),
  ];

  const sorted = useMemo(
    () =>
      (data ?? [])
        .map((row) => ({ row, key: foldForSearch(`${fullName(row)} ${row.club_name ?? ''}`) }))
        .sort((a, b) => NAME_COLLATOR.compare(fullName(a.row), fullName(b.row))),
    [data]
  );

  const { rows, unpaid } = useMemo(() => {
    const term = foldForSearch(search.trim());
    const matching = sorted
      .filter(({ row, key }) => (!clubId || row.club_id === clubId) && (!term || key.includes(term)))
      .map(({ row }) => row);
    return { rows: matching, unpaid: matching.filter(unpaidInForce) };
  }, [sorted, search, clubId]);

  const shown = chip === 'all' ? rows : unpaid;
  const page = shown.slice(offset, offset + PAGE_SIZE);
  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setOffset(0);
  };

  if (isLoading && !data) return <ListLoading label="Cargando socios" />;
  if (error) {
    return (
      <ListError
        title="No se ha podido cargar el estado de los socios"
        description="Comprueba tu conexión e inténtalo de nuevo en unos segundos."
      />
    );
  }

  const filters = (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="status-board-year">Temporada</Label>
        <Select value={String(year)} onValueChange={(value) => resetPage(setYear)(Number(value))}>
          <SelectTrigger id="status-board-year" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear, currentYear + 1].map((option) => (
              <SelectItem key={option} value={String(option)}>
                Temporada {seasonLabel(option)} · licencias {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="status-board-club">Club</Label>
        <ClubFilterSelect id="status-board-club" value={clubId} onValueChange={resetPage(setClubId)} />
      </div>
    </>
  );

  return (
    <div className="space-y-5">
      <ListToolbar
        search={{ value: search, onChange: resetPage(setSearch), placeholder: 'Buscar nombre o club' }}
        filters={filters}
        activeFilters={(year !== currentYear ? 1 : 0) + (clubId ? 1 : 0)}
        onClearFilters={() => {
          setYear(currentYear);
          setClubId('');
          setOffset(0);
        }}
        action={
          <Button size="lg" variant="outline" disabled={exportBoard.isPending} onClick={() => exportBoard.mutate(year)}>
            <Download className="size-5" />
            {exportBoard.isPending ? 'Descargando...' : 'Descargar Excel'}
          </Button>
        }
      />

      <ChipGroup
        label="Mostrar socios"
        value={chip}
        onChange={resetPage(setChip)}
        options={[
          { value: 'all', label: 'Todos', count: rows.length },
          { value: 'unpaid_in_force', label: 'En vigor sin pagar', count: unpaid.length, icon: Clock },
        ]}
      />

      {shown.length === 0 && (
        <EmptyState title="No hay socios que coincidan" description="Prueba con otro nombre o quita los filtros." />
      )}

      <div className="space-y-3 md:hidden">
        {page.map((row) => (
          <article key={row.member_id} className="space-y-2 rounded-[18px] bg-card p-3.5 shadow-card">
            <div>
              <p className="truncate text-base font-bold text-foreground">{fullName(row)}</p>
              <p className="truncate text-sm text-muted-foreground">{row.club_name ?? '-'}</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-sm">
              {columns.map((column) => (
                <div key={column.key} className="contents">
                  <dt className="text-muted-foreground">{column.header(year)}</dt>
                  <dd>{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      {page.length > 0 && (
        <div
          role="region"
          aria-label={`Estado de los socios en ${year}`}
          tabIndex={0}
          className="hidden overflow-x-auto rounded-[18px] bg-card shadow-card md:block"
        >
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">Estado de los socios en {year}</caption>
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="w-[26%] px-4 py-3.5 font-semibold">Nombre y club</th>
                {columns.map((column) => (
                  <th key={column.key} scope="col" className="px-3 py-3.5 font-semibold">{column.header(year)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.map((row) => (
                <tr key={row.member_id} className="border-t border-border">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <span className="block font-bold text-foreground">{fullName(row)}</span>
                    <span className="block max-w-[16rem] truncate text-muted-foreground">{row.club_name ?? '-'}</span>
                  </th>
                  {columns.map((column) => (
                    <td key={column.key} data-column={column.key} className="px-3 py-3">{column.cell(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ListPager total={shown.length} limit={PAGE_SIZE} offset={offset} noun="socios" onPage={setOffset} />

      {paying?.row.club_id && (
        <ManualPaymentModal
          isOpen
          onClose={() => setPaying(null)}
          clubId={paying.row.club_id}
          clubName={paying.row.club_name ?? ''}
          paymentYear={paying.year}
          members={[{ id: paying.row.member_id, name: fullName(paying.row) }]}
          isLoadingMembers={false}
          initialPaymentTypes={paying.items}
          initialPayerName={fullName(paying.row)}
        />
      )}

      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmation?.onConfirm()}
            >
              {confirmation?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
