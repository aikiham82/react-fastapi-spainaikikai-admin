import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { ListPager } from '@/core/components/ListPager';
import { useMemberContext } from '../hooks/useMemberContext';
import { useDebounce } from '@/core/hooks/useDebounce';
import type { Member } from '../data/schemas/member.schema';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { usePermissions } from '@/core/hooks/usePermissions';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { useClubContext } from '@/features/clubs/hooks/useClubContext';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ListToolbar, RowActions } from '@/components/ui/list-controls';
import { MemberForm } from './MemberForm';
import { MemberPaymentStatus } from '@/features/member-payments/components/MemberPaymentStatus';
import { MemberPaymentLines } from '@/features/club-payments/components/MemberPaymentLines';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { GradeBadge, LicenseStatusBadge, InsuranceStatusBadge, MemberAccessBadge, MemberStatusBadge } from './MemberBadges';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useMembersWithAccountQuery } from '@/features/users/hooks/queries/useMembersWithAccountQuery';
import { filterMembersWithAccess } from '../utils/member-access';
import { DEFAULT_MEMBER_STATUS } from '../utils/member-defaults';
import { cn } from '@/lib/utils';

const DEFAULT_STATUS = DEFAULT_MEMBER_STATUS;
const NAME_COLLATOR = new Intl.Collator('es');

const fullName = (member: Member) => `${member.first_name} ${member.last_name ?? ''}`.trim();

const LoadingRows = () => (
  <div role="status" aria-label="Cargando miembros" className="space-y-3">
    {[1, 2, 3, 4].map((i) => (
      <Skeleton key={i} className="h-14 w-full" />
    ))}
  </div>
);

interface MembersEmptyStateProps {
  untouched: boolean;
  statusFilter: string;
  onClear: () => void;
  onIncludeInactive: () => void;
  action: ReactNode;
}

const MembersEmptyState = ({ untouched, statusFilter, onClear, onIncludeInactive, action }: MembersEmptyStateProps) => {
  if (untouched && statusFilter === 'all') {
    return (
      <EmptyState
        title="Todavía no hay miembros"
        description="Cuando añadas el primero aparecerá aquí."
        action={action}
      />
    );
  }
  const includeInactive = statusFilter === 'active' && (
    <Button variant="outline" onClick={onIncludeInactive}>
      Incluir miembros de baja
    </Button>
  );
  if (untouched && statusFilter === 'active') {
    return (
      <EmptyState
        title="Todavía no hay miembros activos"
        description="Si tienes miembros de baja, puedes verlos aquí."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {action}
            {includeInactive}
          </div>
        }
      />
    );
  }
  return (
    <EmptyState
      title="No hay miembros que coincidan"
      description="Prueba con otro nombre o quita los filtros."
      onClear={onClear}
      action={includeInactive}
    />
  );
};

export const MemberList = () => {
  const { members, isLoading, error, setFilters, total, limit, offset, deleteMember, changeMemberStatus, setPagination } = useMemberContext();
  const { canAccess } = usePermissions();
  const { userRole } = useAuthContext();
  const { clubs } = useClubContext();
  const isSuperAdmin = userRole === 'super_admin';
  const canCreate = canAccess({ resource: 'members', action: 'create' });
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyWithAccess, setOnlyWithAccess] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [licenseStatusFilter, setLicenseStatusFilter] = useState<string>('all');
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>(DEFAULT_STATUS);
  const [clubFilter, setClubFilter] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<Member | null>(null);
  const [selectedMemberForPayments, setSelectedMemberForPayments] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [memberToChangeStatus, setMemberToChangeStatus] = useState<Member | null>(null);

  const clubOptions = useMemo(() => [
    { value: '', label: 'Todos los clubs' },
    ...clubs.map(c => ({ value: c.id, label: c.name })),
  ], [clubs]);

  useEffect(() => {
    const search = debouncedSearch || undefined;
    setFilters(prev => (prev.search === search ? prev : { ...prev, search, offset: 0 }));
  }, [debouncedSearch, setFilters]);

  useEffect(() => {
    const statusValue = memberStatusFilter === 'all' ? undefined : memberStatusFilter;
    setFilters(prev => (prev.status === statusValue ? prev : { ...prev, status: statusValue, offset: 0 }));
  }, [memberStatusFilter, setFilters]);

  const { memberIdsWithAccount } = useMembersWithAccountQuery(isSuperAdmin);

  const sortedMembers = useMemo(
    () =>
      filterMembersWithAccess(
        [...members].sort(
          (a, b) =>
            NAME_COLLATOR.compare(a.first_name || '', b.first_name || '') ||
            NAME_COLLATOR.compare(a.last_name || '', b.last_name || '')
        ),
        memberIdsWithAccount,
        onlyWithAccess
      ),
    [members, memberIdsWithAccount, onlyWithAccess]
  );

  const handleLicenseFilter = (value: string) => {
    setLicenseStatusFilter(value);
    const statusValue = value === 'all' ? undefined : value as 'active' | 'expired' | 'pending';
    setFilters(prev => ({ ...prev, license_status: statusValue, offset: 0 }));
  };

  const handleClubFilter = (value: string) => {
    setClubFilter(value);
    setFilters(prev => ({ ...prev, club_id: value || undefined, offset: 0 }));
  };

  const activeFilters =
    (memberStatusFilter !== DEFAULT_STATUS ? 1 : 0) +
    (licenseStatusFilter !== 'all' ? 1 : 0) +
    (isSuperAdmin && clubFilter ? 1 : 0) +
    (isSuperAdmin && onlyWithAccess ? 1 : 0);

  const clearFilters = () => {
    setSearchTerm('');
    setMemberStatusFilter(DEFAULT_STATUS);
    setLicenseStatusFilter('all');
    setClubFilter('');
    setOnlyWithAccess(false);
    setFilters(prev => ({
      ...prev,
      search: undefined,
      status: DEFAULT_STATUS,
      license_status: undefined,
      club_id: undefined,
      offset: 0,
    }));
  };

  const openCreate = () => {
    setSelectedMemberForEdit(null);
    setIsFormOpen(true);
  };

  const openEdit = (member: Member) => {
    setSelectedMemberForEdit(member);
    setIsFormOpen(true);
  };

  const rowActions = (member: Member) => [
    { label: 'Ver pagos', onSelect: () => setSelectedMemberForPayments(member) },
    member.status === 'active'
      ? { label: 'Dar de baja', onSelect: () => setMemberToChangeStatus(member) }
      : { label: 'Reactivar', onSelect: () => setMemberToChangeStatus(member) },
    ...(canAccess({ resource: 'members', action: 'delete' })
      ? [{ label: 'Eliminar', onSelect: () => setMemberToDelete(member), destructive: true }]
      : []),
  ];

  if (isLoading && members.length === 0) {
    return <LoadingRows />;
  }

  if (error) {
    return (
      <EmptyState
        title="No se han podido cargar los miembros"
        description="Comprueba tu conexión e inténtalo de nuevo en unos segundos."
      />
    );
  }

  const filtersPanel = (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="member-status-filter">Estado del miembro</Label>
        <Select value={memberStatusFilter} onValueChange={setMemberStatusFilter}>
          <SelectTrigger id="member-status-filter" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">De baja</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="member-license-filter">Licencia</Label>
        <Select value={licenseStatusFilter} onValueChange={handleLicenseFilter}>
          <SelectTrigger id="member-license-filter" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Activa</SelectItem>
            <SelectItem value="expired">Caducada</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isSuperAdmin && (
        <div className="space-y-1.5">
          <Label htmlFor="member-club-filter">Club</Label>
          <SearchableSelect
            id="member-club-filter"
            options={clubOptions}
            value={clubFilter}
            onValueChange={handleClubFilter}
            placeholder="Todos los clubs"
            searchPlaceholder="Buscar club..."
            emptyMessage="No se encontraron clubs."
          />
        </div>
      )}

      {isSuperAdmin && (
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="only-with-access" className="cursor-pointer">
            Solo con acceso a la web
          </Label>
          <Switch id="only-with-access" checked={onlyWithAccess} onCheckedChange={setOnlyWithAccess} />
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-5">
      <ListToolbar
        search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Buscar miembro' }}
        filters={filtersPanel}
        activeFilters={activeFilters}
        onClearFilters={clearFilters}
        action={canCreate && (
          <Button size="lg" onClick={openCreate}>
            <Plus className="size-4" />
            Nuevo miembro
          </Button>
        )}
      />

      {sortedMembers.length === 0 && (
        <MembersEmptyState
          untouched={!searchTerm && activeFilters - (memberStatusFilter !== DEFAULT_STATUS ? 1 : 0) === 0}
          statusFilter={memberStatusFilter}
          onClear={clearFilters}
          onIncludeInactive={() => setMemberStatusFilter('all')}
          action={canCreate && (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nuevo miembro
            </Button>
          )}
        />
      )}

      <div className="md:hidden divide-y divide-border border-y border-border">
        {sortedMembers.map((member) => (
          <article
            key={member.id}
            data-testid="member-card"
            className={cn('relative flex items-start gap-2 py-3 pr-1 active:bg-muted/60', member.status === 'inactive' && 'opacity-70')}
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <button
                type="button"
                className="block max-w-full truncate text-left text-base font-semibold text-foreground after:absolute after:inset-0 after:content-['']"
                onClick={() => openEdit(member)}
              >
                {fullName(member)}
              </button>
              <p className="truncate text-sm text-muted-foreground">
                {[isSuperAdmin ? member.club_name : null, member.email].filter(Boolean).join(' · ') || '-'}
              </p>
              <p className="text-sm">
                <GradeBadge licenseSummary={member.license_summary} compact />
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <LicenseStatusBadge licenseSummary={member.license_summary} labelled />
                <InsuranceStatusBadge insuranceSummary={member.insurance_summary} type="rc" />
                <InsuranceStatusBadge insuranceSummary={member.insurance_summary} type="accident" />
                <MemberStatusBadge status={member.status} />
                {isSuperAdmin && <MemberAccessBadge hasAccount={memberIdsWithAccount.has(member.id || '')} />}
              </div>
            </div>
            <div className="relative z-10 shrink-0">
              <RowActions label={fullName(member)} actions={rowActions(member)} />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-2.5 py-3 font-medium">Miembro</th>
              {isSuperAdmin && <th className="px-2.5 py-3 font-medium">Club</th>}
              <th className="px-2.5 py-3 font-medium">Grado</th>
              <th className="px-2.5 py-3 font-medium">Seguros</th>
              <th className="px-2.5 py-3 text-right font-medium">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => (
              <tr key={member.id} className={cn('border-b border-border', member.status === 'inactive' && 'opacity-70')}>
                <td className="px-2.5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="text-left font-semibold text-foreground hover:underline"
                      onClick={() => openEdit(member)}
                    >
                      {fullName(member)}
                    </button>
                    <MemberStatusBadge status={member.status} />
                    {isSuperAdmin && <MemberAccessBadge hasAccount={memberIdsWithAccount.has(member.id || '')} />}
                  </div>
                  <p className="max-w-[12rem] truncate text-muted-foreground xl:max-w-[16rem]">
                    {member.email || member.phone || '-'}
                  </p>
                </td>
                {isSuperAdmin && (
                  <td className="max-w-[10rem] px-2.5 py-3 text-muted-foreground xl:max-w-none xl:whitespace-nowrap">{member.club_name || '-'}</td>
                )}
                <td className="px-2.5 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <GradeBadge licenseSummary={member.license_summary} />
                    <LicenseStatusBadge licenseSummary={member.license_summary} />
                  </div>
                </td>
                <td className="px-2.5 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <InsuranceStatusBadge insuranceSummary={member.insurance_summary} type="rc" compact />
                    <InsuranceStatusBadge insuranceSummary={member.insurance_summary} type="accident" compact />
                  </div>
                </td>
                <td className="px-2.5 py-3 text-right">
                  <RowActions label={fullName(member)} actions={rowActions(member)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPager total={total} limit={limit} offset={offset} noun="miembros" onPage={(next) => setPagination(next, limit)} />

      <MemberForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        member={selectedMemberForEdit}
      />

      <Dialog open={!!selectedMemberForPayments} onOpenChange={(open) => !open && setSelectedMemberForPayments(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-8">
              Pagos de {selectedMemberForPayments ? fullName(selectedMemberForPayments) : ''}
            </DialogTitle>
          </DialogHeader>
          {selectedMemberForPayments && (
            <>
              <MemberPaymentStatus memberId={selectedMemberForPayments.id} />
              <MemberPaymentLines
                memberId={selectedMemberForPayments.id}
                memberName={fullName(selectedMemberForPayments)}
                clubId={selectedMemberForPayments.club_id ?? ''}
                clubName={selectedMemberForPayments.club_name ?? ''}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!memberToDelete}
        onOpenChange={(open) => !open && setMemberToDelete(null)}
        description={`Se eliminará permanentemente a "${memberToDelete?.first_name} ${memberToDelete?.last_name}". Esta acción no se puede deshacer.`}
        onConfirm={() => {
          if (memberToDelete) {
            deleteMember(memberToDelete.id);
            setMemberToDelete(null);
          }
        }}
      />

      <AlertDialog open={!!memberToChangeStatus} onOpenChange={(open) => !open && setMemberToChangeStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {memberToChangeStatus?.status === 'active' ? 'Dar de baja' : 'Reactivar miembro'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {memberToChangeStatus?.status === 'active'
                ? `Se dará de baja a "${memberToChangeStatus?.first_name} ${memberToChangeStatus?.last_name}". El miembro quedará inactivo y será excluido de los pagos anuales. Esta acción es reversible.`
                : `Se reactivará a "${memberToChangeStatus?.first_name} ${memberToChangeStatus?.last_name}". El miembro volverá a estar activo y será incluido en los pagos anuales.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (memberToChangeStatus) {
                  const newStatus = memberToChangeStatus.status === 'active' ? 'inactive' : 'active';
                  changeMemberStatus(memberToChangeStatus.id, newStatus);
                  setMemberToChangeStatus(null);
                }
              }}
            >
              {memberToChangeStatus?.status === 'active' ? 'Dar de baja' : 'Reactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
