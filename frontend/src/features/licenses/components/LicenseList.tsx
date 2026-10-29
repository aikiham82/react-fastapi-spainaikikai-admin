import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, CircleX, Clock, Plus } from 'lucide-react';
import { Avatar, BeltBadge } from '@/components/ui/graphic';
import { ListPager } from '@/core/components/ListPager';
import { useDebounce } from '@/core/hooks/useDebounce';
import { usePermissions } from '@/core/hooks/usePermissions';
import { formatDate } from '@/core/utils/format';
import { daysUntil } from '@/core/utils/expiry';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChipGroup, EmptyState, ListToolbar, RowActions, ListLoading, ListError } from '@/components/ui/list-controls';
import { TextLink } from '@/components/ui/text-link';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { MemberPaymentsDialog } from '@/features/member-payments/components/MemberPaymentsDialog';
import { useLicenseContext } from '../hooks/useLicenseContext';
import { useMembersQuery } from '@/features/members/hooks/queries/useMemberQueries';
import type { License, LicenseFilters } from '../data/schemas/license.schema';
import {
  CHIP_TO_ESTADO_PARAM,
  ESTADO_PARAM_TO_CHIP,
  getStatusPresentation,
  getUrgency,
  sortByUrgency,
  type LicenseChip,
} from '../utils/licenseStatus';
import { formatGradeNumber } from '@/core/utils/grade';
import { LicenseForm } from './LicenseForm';
import { RenewLink } from '@/features/annual-payments/components/RenewLink';

type StatusFilter = NonNullable<LicenseFilters['status']>;

const getGradeDisplay = (license: License): string => {
  if (license.instructor_category === 'shidoin') return 'Shidoin';
  if (license.instructor_category === 'fukushidoin') return 'Fukushidoin';
  if (license.technical_grade === 'kyu') return license.dan_grade > 0 ? formatGradeNumber(license.dan_grade, 'Kyu') : 'Kyu';
  if (license.dan_grade > 0) return formatGradeNumber(license.dan_grade, 'Dan');
  return 'Kyu';
};

const beltGradeOf = (license: License): string => {
  if (license.dan_grade > 0) return `${license.dan_grade} ${license.technical_grade === 'kyu' ? 'Kyu' : 'Dan'}`;
  return 'Kyu';
};

const LicenseBelt = ({ license }: { license: License }) => (
  <BeltBadge grade={beltGradeOf(license)} title={license.instructor_category} />
);

const memberNameOf = (license: License) => license.member_name || 'Sin nombre';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Activa' },
  { value: 'expired', label: 'Caducada' },
  { value: 'revoked', label: 'Anulada' },
];

const EMPTY_CHIP_TITLE: Record<LicenseChip, string> = {
  all: 'No hay licencias con estos filtros',
  expired: 'No hay licencias caducadas',
  expiring: 'No hay licencias que caduquen pronto',
};

const LicenseStatusBadge = ({ license }: { license: License }) => {
  const { tone, label, icon } = getStatusPresentation(license);
  return <StatusBadge tone={tone} icon={icon}>{label}</StatusBadge>;
};

const DetailField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-[15px] text-foreground">{children}</p>
  </div>
);

export const LicenseList = () => {
  const { licenses, isLoading, error, filters, setFilters, total, limit, offset, deleteLicense, selectLicense, setPagination } = useLicenseContext();
  const { canAccess } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter | ''>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [licenseToEdit, setLicenseToEdit] = useState<License | null>(null);
  const [licenseToView, setLicenseToView] = useState<License | null>(null);
  const [licenseToDelete, setLicenseToDelete] = useState<License | null>(null);
  const [licenseForPayments, setLicenseForPayments] = useState<License | null>(null);

  const canCreate = canAccess({ resource: 'licenses', action: 'create' });
  const canUpdate = canAccess({ resource: 'licenses', action: 'update' });
  const canRenew = canAccess({ resource: 'payments', action: 'create' });
  const needsRenewal = (license: License) => canRenew && getUrgency(license) !== 'other';
  const canDelete = canAccess({ resource: 'licenses', action: 'delete' });

  const chip: LicenseChip = ESTADO_PARAM_TO_CHIP[searchParams.get('estado') ?? ''] ?? 'all';

  const setChip = (next: LicenseChip) => {
    const params = new URLSearchParams(searchParams);
    const estado = CHIP_TO_ESTADO_PARAM[next];
    if (estado) params.set('estado', estado);
    else params.delete('estado');
    setSearchParams(params, { replace: true });
  };

  const { data: members } = useMembersQuery(undefined, { enabled: isFormOpen });
  const memberOptions = useMemo(
    () =>
      (members ?? []).map((member) => ({
        id: member.id,
        name: `${member.first_name} ${member.last_name || ''}`.trim(),
      })),
    [members],
  );

  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    setFilters({ ...filters, search: debouncedSearch || undefined, offset: 0 });
  }, [debouncedSearch]);

  const handleStatusFilter = (value: string) => {
    const next = value === 'all' ? '' : (value as StatusFilter);
    setStatusFilter(next);
    setFilters({ ...filters, status: next || undefined, offset: 0 });
  };

  const sorted = useMemo(() => sortByUrgency(licenses), [licenses]);
  const counts = useMemo(
    () => ({
      expired: sorted.filter((license) => getUrgency(license) === 'expired').length,
      expiring: sorted.filter((license) => getUrgency(license) === 'expiring').length,
    }),
    [sorted],
  );
  const visible = useMemo(
    () => (chip === 'all' ? sorted : sorted.filter((license) => getUrgency(license) === chip)),
    [sorted, chip],
  );

  const activeFilters = statusFilter ? 1 : 0;
  const hasActiveFilters = !!searchTerm || activeFilters > 0 || chip !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setFilters({ ...filters, search: undefined, status: undefined, offset: 0 });
    setChip('all');
  };

  const openCreate = () => {
    setLicenseToEdit(null);
    setIsFormOpen(true);
  };

  const openEdit = (license: License) => {
    setLicenseToView(null);
    setLicenseToEdit(license);
    setIsFormOpen(true);
  };

  const openDetail = (license: License) => {
    selectLicense(license);
    setLicenseToView(license);
  };

  const askDelete = (license: License) => {
    setLicenseToView(null);
    setLicenseToDelete(license);
  };

  if (isLoading) {
    return <ListLoading />;
  }

  if (error) {
    return <ListError title="Error al cargar las licencias" description={error.message} />;
  }

  const createButton = canCreate ? (
    <Button size="lg" onClick={openCreate}>
      <Plus className="size-5" />
      Nueva licencia
    </Button>
  ) : undefined;

  const rowActions = (license: License) => {
    return [
      { label: 'Ver detalle', onSelect: () => openDetail(license) },
      { label: 'Ver pagos', onSelect: () => setLicenseForPayments(license) },
      ...(canUpdate ? [{ label: 'Editar', onSelect: () => openEdit(license) }] : []),
      ...(canDelete ? [{ label: 'Eliminar', onSelect: () => askDelete(license), destructive: true }] : []),
    ];
  };

  const filtersPanel = (
    <div className="space-y-2">
      <Label htmlFor="license-status-filter">Estado de la licencia</Label>
      <Select value={statusFilter || 'all'} onValueChange={handleStatusFilter}>
        <SelectTrigger id="license-status-filter" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-5">
      <ListToolbar
        search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Buscar miembro' }}
        filters={filtersPanel}
        activeFilters={activeFilters}
        onClearFilters={clearFilters}
        action={createButton}
      />

      {!canCreate && (
        <p className="text-sm text-muted-foreground">
          Las licencias se crean al registrar el pago de la temporada.{' '}
          <TextLink to="/payments" variant="inline" className="font-medium">
            Ir a pagar
          </TextLink>
        </p>
      )}

      <ChipGroup
        label="Mostrar licencias"
        value={chip}
        onChange={setChip}
        options={[
          { value: 'all', label: 'Todas', count: sorted.length },
          { value: 'expired', label: 'Caducadas', count: counts.expired, icon: CircleX },
          { value: 'expiring', label: 'Caducan pronto', count: counts.expiring, icon: Clock },
        ]}
      />

      {visible.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title={EMPTY_CHIP_TITLE[chip]}
            description="Prueba con otra búsqueda o quita los filtros para ver todas."
            onClear={clearFilters}
          />
        ) : (
          <EmptyState
            title="Todavía no hay licencias"
            description={canCreate ? 'Crea la primera licencia con el botón Nueva licencia.' : undefined}
          />
        )
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {visible.map((license) => (
              <li key={license.id} className="rounded-[18px] bg-card shadow-card">
                <button
                  type="button"
                  onClick={() => openDetail(license)}
                  className="flex w-full items-start gap-3 rounded-[18px] p-3.5 text-left transition-colors active:bg-muted/60"
                >
                  <Avatar name={memberNameOf(license)} size="md" />
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-base font-bold text-foreground">{memberNameOf(license)}</span>
                      <span className="block text-sm text-muted-foreground">{license.license_number}</span>
                    </span>
                    <LicenseBelt license={license} />
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      <LicenseStatusBadge license={license} />
                      <span className="text-sm text-muted-foreground">
                        {daysUntil(license.expiry_date) < 0 ? 'Caducó el' : 'Caduca el'} {formatDate(license.expiry_date)}
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 self-center text-muted-foreground" aria-hidden="true" />
                </button>
                {needsRenewal(license) && (
                  <div className="flex justify-end px-3.5 pb-3.5">
                    <RenewLink memberId={license.member_id} memberName={memberNameOf(license)} kind="licencia" />
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-[18px] bg-card shadow-card md:block">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="w-[32%] px-4 py-3.5 font-semibold">Miembro</th>
                  <th className="w-[19%] px-3 py-3.5 font-semibold">Grado</th>
                  <th className="hidden w-[12%] px-3 py-3.5 font-semibold xl:table-cell">Emisión</th>
                  <th className="w-[14%] px-3 py-3.5 font-semibold">Caducidad</th>
                  <th className="w-[17%] px-3 py-3.5 font-semibold">Estado</th>
                  <th className="w-40 px-3 py-3.5"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((license) => (
                  <tr key={license.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => openDetail(license)} className="flex w-full min-w-0 items-center gap-3 text-left">
                        <Avatar name={memberNameOf(license)} size="md" />
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-bold text-foreground">{memberNameOf(license)}</span>
                          <span className="block truncate text-muted-foreground">{license.license_number}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3"><LicenseBelt license={license} /></td>
                    <td className="hidden px-3 py-3 text-muted-foreground xl:table-cell">{formatDate(license.issue_date)}</td>
                    <td className="px-3 py-3 text-foreground">{formatDate(license.expiry_date)}</td>
                    <td className="px-3 py-3"><LicenseStatusBadge license={license} /></td>
                    <td className="px-1 py-1.5">
                      <span className="flex items-center justify-end gap-1">
                        {needsRenewal(license) && <RenewLink memberId={license.member_id} memberName={memberNameOf(license)} kind="licencia" />}
                        <RowActions label={`licencia ${license.license_number}`} actions={rowActions(license)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {chip === 'all' && <ListPager total={total} limit={limit} offset={offset} noun="licencias" onPage={(next) => setPagination(next, limit)} />}

      <MemberPaymentsDialog
        memberId={licenseForPayments?.member_id ?? null}
        memberName={licenseForPayments?.member_name ?? ''}
        onClose={() => setLicenseForPayments(null)}
      />

      <Dialog open={!!licenseToView} onOpenChange={(open) => !open && setLicenseToView(null)}>
        {licenseToView && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Licencia {licenseToView.license_number}</DialogTitle>
              <DialogDescription>{licenseToView.member_name || 'Sin nombre'}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
              <DetailField label="Fecha de emisión">{formatDate(licenseToView.issue_date)}</DetailField>
              <DetailField label="Fecha de caducidad">{formatDate(licenseToView.expiry_date)}</DetailField>
              <DetailField label="Grado">{getGradeDisplay(licenseToView)}</DetailField>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Estado</p>
                <LicenseStatusBadge license={licenseToView} />
              </div>
            </div>
            {(canDelete || canUpdate) && (
              <DialogFooter>
                {canDelete && (
                  <Button variant="ghost" className="text-danger sm:mr-auto" onClick={() => askDelete(licenseToView)}>
                    Eliminar
                  </Button>
                )}
                {canUpdate && <Button onClick={() => openEdit(licenseToView)}>Editar</Button>}
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>

      <LicenseForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        license={licenseToEdit}
        memberOptions={memberOptions}
      />

      <ConfirmDeleteDialog
        open={!!licenseToDelete}
        onOpenChange={(open) => !open && setLicenseToDelete(null)}
        description={`Se eliminará permanentemente la licencia "${licenseToDelete?.license_number}". Esta acción no se puede deshacer.`}
        onConfirm={() => {
          if (licenseToDelete) {
            deleteLicense(licenseToDelete.id);
            setLicenseToDelete(null);
          }
        }}
      />
    </div>
  );
};
