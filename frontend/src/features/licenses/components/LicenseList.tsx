import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ListPager } from '@/core/components/ListPager';
import { useDebounce } from '@/core/hooks/useDebounce';
import { usePermissions } from '@/core/hooks/usePermissions';
import { formatDate } from '@/core/utils/format';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChipGroup, EmptyState, ListToolbar, RowActions } from '@/components/ui/list-controls';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { useLicenseContext } from '../hooks/useLicenseContext';
import { useMemberContext } from '../../members/hooks/useMemberContext';
import type { License, LicenseFilters } from '../data/schemas/license.schema';
import {
  CHIP_TO_ESTADO_PARAM,
  ESTADO_PARAM_TO_CHIP,
  getStatusPresentation,
  getUrgency,
  sortByUrgency,
  type LicenseChip,
} from '../utils/licenseStatus';
import { LicenseForm } from './LicenseForm';

type StatusFilter = NonNullable<LicenseFilters['status']>;

const getGradeDisplay = (license: License): string => {
  if (license.instructor_category === 'shidoin') return 'Shidoin';
  if (license.instructor_category === 'fukushidoin') return 'Fukushidoin';
  if (license.technical_grade === 'kyu') return license.dan_grade > 0 ? `${license.dan_grade}º Kyu` : 'Kyu';
  if (license.dan_grade > 0) return `${license.dan_grade}º Dan`;
  return 'Kyu';
};

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
  const { tone, label } = getStatusPresentation(license);
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
};

const DetailField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-[15px] text-foreground">{children}</p>
  </div>
);

export const LicenseList = () => {
  const { licenses, isLoading, error, filters, setFilters, total, limit, offset, deleteLicense, selectLicense, setPagination } = useLicenseContext();
  const { members } = useMemberContext();
  const { canAccess } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter | ''>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [licenseToEdit, setLicenseToEdit] = useState<License | null>(null);
  const [licenseToView, setLicenseToView] = useState<License | null>(null);
  const [licenseToDelete, setLicenseToDelete] = useState<License | null>(null);

  const canCreate = canAccess({ resource: 'licenses', action: 'create' });
  const canUpdate = canAccess({ resource: 'licenses', action: 'update' });
  const canDelete = canAccess({ resource: 'licenses', action: 'delete' });

  const chip: LicenseChip = ESTADO_PARAM_TO_CHIP[searchParams.get('estado') ?? ''] ?? 'all';

  const setChip = (next: LicenseChip) => {
    const params = new URLSearchParams(searchParams);
    const estado = CHIP_TO_ESTADO_PARAM[next];
    if (estado) params.set('estado', estado);
    else params.delete('estado');
    setSearchParams(params, { replace: true });
  };

  const memberOptions = members.map(member => ({
    id: member.id,
    name: `${member.first_name} ${member.last_name || ''}`.trim()
  }));

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
    () => (chip === 'all' ? sorted : sorted.filter((license) => getUrgency(license) === (chip === 'expired' ? 'expired' : 'expiring'))),
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
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-b-2 border-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-danger">Error al cargar las licencias</p>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const createButton = canCreate ? (
    <Button onClick={openCreate}>
      <Plus className="size-4" />
      Nueva licencia
    </Button>
  ) : undefined;

  const rowActions = (license: License) => {
    return [
      { label: 'Ver detalle', onSelect: () => openDetail(license) },
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
          <Link to="/payments" className="font-medium text-foreground underline underline-offset-4">
            Ir a pagar
          </Link>
        </p>
      )}

      <ChipGroup
        label="Mostrar licencias"
        value={chip}
        onChange={setChip}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 'expired', label: 'Caducadas', count: counts.expired },
          { value: 'expiring', label: 'Caducan pronto', count: counts.expiring },
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
          <ul className="md:hidden">
            {visible.map((license) => (
              <li key={license.id} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => openDetail(license)}
                  className="flex w-full flex-col gap-1.5 px-1 py-3.5 text-left"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium text-foreground">{license.member_name || 'Sin nombre'}</span>
                      <span className="block text-sm text-muted-foreground">{license.license_number}</span>
                    </span>
                    <LicenseStatusBadge license={license} />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {getGradeDisplay(license)} · Caduca el {formatDate(license.expiry_date)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="w-[36%] px-3 py-3 font-medium">Miembro</th>
                  <th className="w-[11%] px-3 py-3 font-medium">Grado</th>
                  <th className="hidden w-[12%] px-3 py-3 font-medium xl:table-cell">Emisión</th>
                  <th className="w-[15%] px-3 py-3 font-medium">Caducidad</th>
                  <th className="w-[17%] px-3 py-3 font-medium">Estado</th>
                  <th className="w-14 px-3 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((license) => (
                  <tr key={license.id} className="border-b border-border">
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => openDetail(license)} className="block w-full min-w-0 text-left">
                        <span className="block truncate text-[15px] font-medium text-foreground">{license.member_name || 'Sin nombre'}</span>
                        <span className="block truncate text-muted-foreground">{license.license_number}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-foreground">{getGradeDisplay(license)}</td>
                    <td className="hidden px-3 py-3 text-muted-foreground xl:table-cell">{formatDate(license.issue_date)}</td>
                    <td className="px-3 py-3 text-foreground">{formatDate(license.expiry_date)}</td>
                    <td className="px-3 py-3"><LicenseStatusBadge license={license} /></td>
                    <td className="px-1 py-1.5 text-right">
                      <RowActions label={`licencia ${license.license_number}`} actions={rowActions(license)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {chip === 'all' && <ListPager total={total} limit={limit} offset={offset} noun="licencias" onPage={(next) => setPagination(next, limit)} />}

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
            <DialogFooter>
              {canDelete && (
                <Button variant="ghost" className="text-danger sm:mr-auto" onClick={() => askDelete(licenseToView)}>
                  Eliminar
                </Button>
              )}
              {canUpdate && <Button onClick={() => openEdit(licenseToView)}>Editar</Button>}
            </DialogFooter>
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
