import { useMemo, useState, type ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { ChipGroup, EmptyState, ListError, ListLoading, ListToolbar } from '@/components/ui/list-controls';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListPager } from '@/core/components/ListPager';
import { ClubFilterSelect } from '@/features/clubs/components/ClubFilterSelect';
import { LicenseStatusBadge } from '@/features/members/components/MemberBadges';
import { insurancePresentation } from '@/features/members/utils/member-attention';
import type { MemberStatusRow } from '../data/schemas/member-status.schema';
import { useMemberStatusBoardQuery } from '../hooks/queries/useMemberStatusBoardQuery';

const PAGE_SIZE = 50;
const NAME_COLLATOR = new Intl.Collator('es');

type Chip = 'all' | 'unpaid_in_force';

const fullName = (row: MemberStatusRow) => `${row.first_name} ${row.last_name}`.trim();

const normalized = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const licenceInForce = (row: MemberStatusRow) => row.license_summary?.status === 'active';

const unpaidInForce = (row: MemberStatusRow) => licenceInForce(row) && !row.license_paid;

function PaidBadge({ row }: { row: MemberStatusRow }) {
  if (row.license_paid) return <StatusBadge tone="ok">Pagada</StatusBadge>;
  return <StatusBadge tone={licenceInForce(row) ? 'warn' : 'neutral'}>Sin pagar</StatusBadge>;
}

function MemberBadge({ status }: { status: string }) {
  return status === 'active'
    ? <StatusBadge tone="ok">Activo</StatusBadge>
    : <StatusBadge tone="neutral">De baja</StatusBadge>;
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

const COLUMNS: Column[] = [
  { key: 'paid', header: (year) => `Licencia ${year} pagada`, cell: (row) => <PaidBadge row={row} /> },
  { key: 'member', header: () => 'Miembro', cell: (row) => <MemberBadge status={row.member_status} /> },
  { key: 'licence', header: () => 'Licencia', cell: (row) => <LicenseStatusBadge licenseSummary={row.license_summary ?? undefined} /> },
  {
    key: 'accident',
    header: () => 'Accidentes',
    cell: (row) => <InsuranceBadge has={row.insurance_summary?.has_accident} status={row.insurance_summary?.accident_status} />,
  },
  {
    key: 'rc',
    header: () => 'RC',
    cell: (row) => <InsuranceBadge has={row.insurance_summary?.has_rc} status={row.insurance_summary?.rc_status} />,
  },
];

export const MemberStatusBoard = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState('');
  const [clubId, setClubId] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error } = useMemberStatusBoardQuery(year);

  const rows = useMemo(() => {
    const term = normalized(search.trim());
    return [...(data ?? [])]
      .filter((row) => !clubId || row.club_id === clubId)
      .filter((row) => !term || normalized(`${fullName(row)} ${row.club_name ?? ''}`).includes(term))
      .sort((a, b) => NAME_COLLATOR.compare(fullName(a), fullName(b)));
  }, [data, search, clubId]);

  const shown = chip === 'all' ? rows : rows.filter(unpaidInForce);
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
        <Label htmlFor="status-board-year">Año de la licencia</Label>
        <Select value={String(year)} onValueChange={(value) => resetPage(setYear)(Number(value))}>
          <SelectTrigger id="status-board-year" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear, currentYear + 1].map((option) => (
              <SelectItem key={option} value={String(option)}>{option}</SelectItem>
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
      />

      <ChipGroup
        label="Mostrar socios"
        value={chip}
        onChange={resetPage(setChip)}
        options={[
          { value: 'all', label: 'Todos', count: rows.length },
          { value: 'unpaid_in_force', label: 'En vigor sin pagar', count: rows.filter(unpaidInForce).length, icon: Clock },
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
              {COLUMNS.map((column) => (
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
          <table className="w-full text-sm">
            <caption className="sr-only">Estado de los socios en {year}</caption>
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3.5 font-semibold">Socio</th>
                {COLUMNS.map((column) => (
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
                  {COLUMNS.map((column) => (
                    <td key={column.key} data-column={column.key} className="px-3 py-3">{column.cell(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ListPager total={shown.length} limit={PAGE_SIZE} offset={offset} noun="socios" onPage={setOffset} />
    </div>
  );
};
