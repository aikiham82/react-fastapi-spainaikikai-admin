import { useMemo, useState } from 'react';
import { HeartPulse, ShieldCheck, ShieldPlus, type LucideIcon } from 'lucide-react';
import { Avatar, IconTile } from '@/components/ui/graphic';
import { ListPager } from '@/core/components/ListPager';
import { useInsuranceContext } from '../hooks/useInsuranceContext';
import type { Insurance, InsuranceType } from '../data/schemas/insurance.schema';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ClubFilterSelect } from '@/features/clubs/components/ClubFilterSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, ListToolbar, RowActions, ListLoading, ListError } from '@/components/ui/list-controls';
import { StatusBadge } from '@/components/ui/status-badge';
import { usePermissions } from '@/core/hooks/usePermissions';
import { InsuranceForm } from './InsuranceForm';
import { RenewLink } from '@/features/annual-payments/components/RenewLink';
import { InsuranceDetailDialog } from './InsuranceDetailDialog';
import { insuranceStatus, insuranceTypeLabel, needsRenewal } from './insuranceDisplay';
import { foldForSearch } from '@/core/utils/search';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { useMembersQuery } from '@/features/members/hooks/queries/useMemberQueries';
import { formatCurrency, formatDate } from '@/core/utils/format';

const ALL = 'all';

const typeIcon = (type: string): LucideIcon => (type === 'accident' ? HeartPulse : ShieldCheck);

const memberNameOf = (insurance: Insurance) => insurance.member_name || 'Sin miembro';

const InsuranceKind = ({ type }: { type: string }) => {
  const Icon = typeIcon(type);
  return (
    <span className="inline-flex items-center gap-1.5 text-foreground">
      <Icon className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
      {insuranceTypeLabel(type)}
    </span>
  );
};

export const InsuranceList = () => {
  const { insuranceList, isLoading, error, filters, setFilters, total, limit, offset, deleteInsurance, selectInsurance, setPagination } = useInsuranceContext();
  const { canAccess, isAssociationAdmin } = usePermissions();
  const isSuperAdmin = isAssociationAdmin();
  const canCreate = canAccess({ resource: 'insurance', action: 'create' });
  const canUpdate = canAccess({ resource: 'insurance', action: 'update' });
  const canDelete = canAccess({ resource: 'insurance', action: 'delete' });
  const canRenew = canAccess({ resource: 'payments', action: 'create' });
  const renewalOf = (insurance: Insurance) =>
    canRenew && insurance.member_id && needsRenewal(insurance) ? (
      <RenewLink
        memberId={insurance.member_id}
        memberName={memberNameOf(insurance)}
        kind={insurance.insurance_type === 'accident' ? 'accidentes' : 'rc'}
      />
    ) : null;

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [clubFilter, setClubFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [insuranceForEdit, setInsuranceForEdit] = useState<Insurance | null>(null);
  const [insuranceForDetail, setInsuranceForDetail] = useState<Insurance | null>(null);
  const [insuranceToDelete, setInsuranceToDelete] = useState<Insurance | null>(null);

  const { data: members } = useMembersQuery(undefined, { enabled: isFormOpen });
  const memberOptions = useMemo(
    () => (members ?? []).map((m) => ({ id: m.id, name: `${m.first_name} ${m.last_name}` })),
    [members],
  );

  const visibleInsurance = useMemo(() => {
    const term = foldForSearch(searchTerm.trim());
    if (!term) return insuranceList;
    return insuranceList.filter((insurance) =>
      foldForSearch(`${insurance.member_name ?? ''} ${insurance.policy_number}`).includes(term)
    );
  }, [insuranceList, searchTerm]);

  const activeFilters = (typeFilter !== ALL ? 1 : 0) + (statusFilter !== ALL ? 1 : 0) + (clubFilter ? 1 : 0);
  const hasCriteria = activeFilters > 0 || searchTerm.trim() !== '';

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setFilters({ ...filters, insurance_type: value === ALL ? undefined : (value as InsuranceType), offset: 0 });
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setFilters({ ...filters, status: value === ALL ? undefined : (value as 'active' | 'expired'), offset: 0 });
  };

  const handleClubFilter = (value: string) => {
    setClubFilter(value);
    setFilters({ ...filters, club_id: value || undefined, offset: 0 });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter(ALL);
    setStatusFilter(ALL);
    setClubFilter('');
    setFilters({ ...filters, insurance_type: undefined, status: undefined, club_id: undefined, offset: 0 });
  };

  const openCreate = () => {
    setInsuranceForEdit(null);
    setIsFormOpen(true);
  };

  const openEdit = (insurance: Insurance) => {
    setInsuranceForDetail(null);
    setInsuranceForEdit(insurance);
    setIsFormOpen(true);
  };

  const askDelete = (insurance: Insurance) => {
    setInsuranceForDetail(null);
    setInsuranceToDelete(insurance);
  };

  const openDetail = (insurance: Insurance) => {
    selectInsurance(insurance);
    setInsuranceForDetail(insurance);
  };

  const rowActions = (insurance: Insurance) => [
    ...(canUpdate ? [{ label: 'Editar', onSelect: () => openEdit(insurance) }] : []),
    ...(canDelete ? [{ label: 'Eliminar', onSelect: () => setInsuranceToDelete(insurance), destructive: true }] : []),
  ];

  if (isLoading) {
    return <ListLoading />;
  }

  if (error) {
    return <ListError title="Error al cargar los seguros" description={error.message} />;
  }

  const createButton = canCreate && (
    <Button size="lg" onClick={openCreate}>
      <ShieldPlus className="size-5" />
      Nuevo seguro
    </Button>
  );

  const dialogs = (
    <>
      <InsuranceForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        insurance={insuranceForEdit}
        memberOptions={memberOptions}
      />
      <InsuranceDetailDialog
        insurance={insuranceForDetail}
        onClose={() => setInsuranceForDetail(null)}
        onEdit={canUpdate ? openEdit : undefined}
        onDelete={canDelete ? askDelete : undefined}
      />
      <ConfirmDeleteDialog
        open={!!insuranceToDelete}
        onOpenChange={(open) => !open && setInsuranceToDelete(null)}
        description="Se eliminará este seguro de forma permanente. Esta acción no se puede deshacer."
        onConfirm={() => {
          if (insuranceToDelete) {
            deleteInsurance(insuranceToDelete.id);
            setInsuranceToDelete(null);
          }
        }}
      />
    </>
  );

  if (insuranceList.length === 0 && !hasCriteria) {
    return (
      <>
        <EmptyState title="Todavía no hay seguros" description="Cuando registres un seguro aparecerá aquí." action={createButton || undefined} />
        {dialogs}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <ListToolbar
        search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Buscar seguro' }}
        activeFilters={activeFilters}
        onClearFilters={clearFilters}
        filters={
          <>
            <div className="space-y-2">
              <Label htmlFor="insurance-type-filter">Tipo de seguro</Label>
              <Select value={typeFilter} onValueChange={handleTypeFilter}>
                <SelectTrigger id="insurance-type-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="accident">{insuranceTypeLabel('accident')}</SelectItem>
                  <SelectItem value="civil_liability">{insuranceTypeLabel('civil_liability')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="insurance-status-filter">Estado</Label>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger id="insurance-status-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="expired">Caducado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="insurance-club-filter">Club</Label>
                <ClubFilterSelect id="insurance-club-filter" value={clubFilter} onValueChange={handleClubFilter} />
              </div>
            )}
          </>
        }
        action={createButton || undefined}
      />

      {visibleInsurance.length === 0 ? (
        <EmptyState
          title="No hay seguros con esos criterios"
          description="Prueba con otra búsqueda o quita los filtros."
          onClear={clearFilters}
        />
      ) : (
        <>
          <ul className="space-y-3 xl:hidden">
            {visibleInsurance.map((insurance) => {
              const status = insuranceStatus(insurance);
              const actions = rowActions(insurance);
              const renewal = renewalOf(insurance);
              return (
                <li
                  key={insurance.id}
                  onClick={() => openDetail(insurance)}
                  className="flex cursor-pointer items-start gap-3 rounded-[18px] bg-card p-3.5 pr-1.5 shadow-card transition-colors active:bg-muted/60"
                >
                  <Avatar name={memberNameOf(insurance)} size="md" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <button
                      type="button"
                      className="block max-w-full truncate text-left text-base font-bold text-foreground"
                      onClick={() => openDetail(insurance)}
                    >
                      {memberNameOf(insurance)}
                    </button>
                    <p className="text-sm">
                      <InsuranceKind type={insurance.insurance_type} />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(insurance.start_date)} a {formatDate(insurance.end_date)}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      {!!insurance.coverage_amount && (
                        <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(insurance.coverage_amount)}</span>
                      )}
                    </div>
                    {renewal && <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>{renewal}</div>}
                  </div>
                  {actions.length > 0 && <RowActions label={insurance.member_name || 'seguro'} actions={actions} />}
                </li>
              );
            })}
          </ul>

          <div className="hidden overflow-hidden rounded-[18px] bg-card shadow-card xl:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="w-[34%] min-w-[11rem] px-4 py-3.5 font-semibold">Miembro</th>
                  <th className="px-3 py-3.5 font-semibold">Tipo</th>
                  <th className="px-3 py-3.5 font-semibold">Vigencia</th>
                  <th className="px-3 py-3.5 text-right font-semibold">Cobertura</th>
                  <th className="px-3 py-3.5 font-semibold">Estado</th>
                  <th className="w-44 px-2 py-3.5">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleInsurance.map((insurance) => {
                  const status = insuranceStatus(insurance);
                  const actions = rowActions(insurance);
                  return (
                    <tr
                      key={insurance.id}
                      onClick={() => openDetail(insurance)}
                      className="cursor-pointer border-t border-border hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={memberNameOf(insurance)} size="md" />
                          <div className="min-w-0">
                            <button type="button" className="text-left font-bold text-foreground" onClick={() => openDetail(insurance)}>
                              {memberNameOf(insurance)}
                            </button>
                            {insurance.policy_number && (
                              <p className="whitespace-nowrap text-muted-foreground">{insurance.policy_number}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <IconTile
                            icon={typeIcon(insurance.insurance_type)}
                            tone={insurance.insurance_type === 'accident' ? 'brand' : 'neutral'}
                            className="size-9 rounded-lg"
                          />
                          <span className="whitespace-nowrap text-foreground">{insuranceTypeLabel(insurance.insurance_type).replace(" (RC)", "")}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground lg:whitespace-nowrap">
                        {formatDate(insurance.start_date)}
                        <span className="hidden lg:inline"> a </span>
                        <span className="block lg:inline">
                          <span className="lg:hidden">hasta </span>
                          {formatDate(insurance.end_date)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">
                        {insurance.coverage_amount ? formatCurrency(insurance.coverage_amount) : '-'}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      </td>
                      <td className="px-1 py-1.5">
                        <span className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                          {renewalOf(insurance)}
                          {actions.length > 0 && <RowActions label={insurance.member_name || 'seguro'} actions={actions} />}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ListPager total={total} limit={limit} offset={offset} noun="seguros" onPage={(next) => setPagination(next, limit)} />
      {dialogs}
    </div>
  );
};
