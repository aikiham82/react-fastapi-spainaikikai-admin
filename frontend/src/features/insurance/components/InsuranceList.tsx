import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { ListPager } from '@/core/components/ListPager';
import { useInsuranceContext } from '../hooks/useInsuranceContext';
import type { Insurance, InsuranceType } from '../data/schemas/insurance.schema';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, ListToolbar, RowActions, ListLoading, ListError } from '@/components/ui/list-controls';
import { StatusBadge } from '@/components/ui/status-badge';
import { usePermissions } from '@/core/hooks/usePermissions';
import { InsuranceForm } from './InsuranceForm';
import { InsuranceDetailDialog } from './InsuranceDetailDialog';
import { insuranceStatus, insuranceTypeLabel } from './insuranceDisplay';
import { foldForSearch } from '@/core/utils/search';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { useMembersQuery } from '@/features/members/hooks/queries/useMemberQueries';
import { formatCurrency, formatDate } from '@/core/utils/format';

const ALL = 'all';

export const InsuranceList = () => {
  const { insuranceList, isLoading, error, filters, setFilters, total, limit, offset, deleteInsurance, selectInsurance, setPagination } = useInsuranceContext();
  const { canAccess } = usePermissions();
  const canCreate = canAccess({ resource: 'insurance', action: 'create' });
  const canUpdate = canAccess({ resource: 'insurance', action: 'update' });
  const canDelete = canAccess({ resource: 'insurance', action: 'delete' });

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
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

  const activeFilters = (typeFilter !== ALL ? 1 : 0) + (statusFilter !== ALL ? 1 : 0);
  const hasCriteria = activeFilters > 0 || searchTerm.trim() !== '';

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setFilters({ ...filters, insurance_type: value === ALL ? undefined : (value as InsuranceType), offset: 0 });
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setFilters({ ...filters, status: value === ALL ? undefined : (value as 'active' | 'expired'), offset: 0 });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter(ALL);
    setStatusFilter(ALL);
    setFilters({ ...filters, insurance_type: undefined, status: undefined, offset: 0 });
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
    <Button onClick={openCreate}>
      <Plus className="size-4" />
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
        search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Buscar por nombre o póliza' }}
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
          <ul className="md:hidden">
            {visibleInsurance.map((insurance) => {
              const status = insuranceStatus(insurance);
              const actions = rowActions(insurance);
              return (
                <li
                  key={insurance.id}
                  onClick={() => openDetail(insurance)}
                  className="flex cursor-pointer items-start gap-2 border-b border-border py-3 first:border-t"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="truncate text-left text-[15px] font-medium text-foreground"
                        onClick={() => openDetail(insurance)}
                      >
                        {insurance.member_name || 'Sin miembro'}
                      </button>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insuranceTypeLabel(insurance.insurance_type)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(insurance.start_date)} a {formatDate(insurance.end_date)}
                    </p>
                    {!!insurance.coverage_amount && (
                      <p className="text-sm tabular-nums text-foreground">{formatCurrency(insurance.coverage_amount)}</p>
                    )}
                  </div>
                  {actions.length > 0 && <RowActions label={insurance.member_name || 'seguro'} actions={actions} />}
                </li>
              );
            })}
          </ul>

          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Miembro</th>
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 pr-3 font-medium">Vigencia</th>
                <th className="py-2 pr-3 text-right font-medium">Cobertura</th>
                <th className="py-2 pr-3 font-medium">Estado</th>
                <th className="w-12 py-2">
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
                    className="cursor-pointer border-b border-border hover:bg-muted/50"
                  >
                    <td className="py-3 pr-3">
                      <button type="button" className="text-left font-medium text-foreground" onClick={() => openDetail(insurance)}>
                        {insurance.member_name || 'Sin miembro'}
                      </button>
                      {insurance.policy_number && (
                        <p className="whitespace-nowrap text-muted-foreground">{insurance.policy_number}</p>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-foreground">{insuranceTypeLabel(insurance.insurance_type)}</td>
                    <td className="whitespace-nowrap py-3 pr-3 text-muted-foreground">
                      {formatDate(insurance.start_date)} a {formatDate(insurance.end_date)}
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums text-foreground">
                      {insurance.coverage_amount ? formatCurrency(insurance.coverage_amount) : '-'}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </td>
                    <td className="py-3 text-right">
                      {actions.length > 0 && <RowActions label={insurance.member_name || 'seguro'} actions={actions} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <ListPager total={total} limit={limit} offset={offset} noun="seguros" onPage={(next) => setPagination(next, limit)} />
      {dialogs}
    </div>
  );
};
