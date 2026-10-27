import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { ListPager } from '@/core/components/ListPager';
import { useMemberContext } from '../hooks/useMemberContext';
import { useDebounce } from '@/core/hooks/useDebounce';
import type { Member } from '../data/schemas/member.schema';
import { CircleX, Clock, ShieldOff, UserPlus } from 'lucide-react';
import { Avatar } from '@/components/ui/graphic';
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
import { ChipGroup, EmptyState, ListToolbar, RowActions } from '@/components/ui/list-controls';
import { MemberForm } from './MemberForm';
import { MemberPaymentStatus } from '@/features/member-payments/components/MemberPaymentStatus';
import { MemberPaymentLines } from '@/features/club-payments/components/MemberPaymentLines';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { GradeBadge, InsuranceTiles, LicenseStatusBadge, MemberAccessBadge, MemberStatusBadge } from './MemberBadges';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useMembersWithAccountQuery } from '@/features/users/hooks/queries/useMembersWithAccountQuery';
import { filterMembersWithAccess } from '../utils/member-access';
import { DEFAULT_MEMBER_STATUS } from '../utils/member-defaults';
import { countMemberChips, matchesMemberChip, type MemberChip } from '../utils/member-attention';

const DEFAULT_STATUS = DEFAULT_MEMBER_STATUS;
const NAME_COLLATOR = new Intl.Collator('es');

const fullName = (member: Member) => `${member.first_name} ${member.last_name ?? ''}`.trim();

const secondaryLine = (member: Member, isSuperAdmin: boolean) =>
  (isSuperAdmin ? member.club_name : null) || member.email || member.phone || '-';

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
  const [chip, setChip] = useState<MemberChip>('all');
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

  const accessibleMembers = useMemo(
    () => filterMembersWithAccess(members, memberIdsWithAccount, onlyWithAccess),
    [members, memberIdsWithAccount, onlyWithAccess]
  );
  const chipCounts = useMemo(() => countMemberChips(accessibleMembers), [accessibleMembers]);

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
      ).filter((member) => matchesMemberChip(member, chip)),
    [members, memberIdsWithAccount, onlyWithAccess, chip]
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
    setChip('all');
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
            <UserPlus className="size-5" />
            Nuevo miembro
          </Button>
        )}
      />

      <ChipGroup
        label="Mostrar miembros"
        value={chip}
        onChange={setChip}
        options={[
          { value: 'all', label: 'Todos', count: chipCounts.all },
          { value: 'expired', label: 'Caducadas', count: chipCounts.expired, icon: CircleX },
          { value: 'expiring', label: 'Caducan pronto', count: chipCounts.expiring, icon: Clock },
          { value: 'uninsured', label: 'Sin seguro', count: chipCounts.uninsured, icon: ShieldOff },
        ]}
      />

      {sortedMembers.length === 0 && (
        <MembersEmptyState
          untouched={!searchTerm && chip === 'all' && activeFilters - (memberStatusFilter !== DEFAULT_STATUS ? 1 : 0) === 0}
          statusFilter={memberStatusFilter}
          onClear={clearFilters}
          onIncludeInactive={() => setMemberStatusFilter('all')}
          action={canCreate && (
            <Button onClick={openCreate}>
              <UserPlus className="size-5" />
              Nuevo miembro
            </Button>
          )}
        />
      )}

      <div className="space-y-3 md:hidden">
        {sortedMembers.map((member) => (
          <article
            key={member.id}
            data-testid="member-card"
            className="relative flex items-start gap-3 rounded-[18px] bg-card p-3.5 pr-1.5 shadow-card transition-colors active:bg-muted/60"
          >
            <Avatar name={fullName(member)} size="md" />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <button
                  type="button"
                  className="block max-w-full truncate text-left text-base font-bold text-foreground after:absolute after:inset-0 after:content-['']"
                  onClick={() => openEdit(member)}
                >
                  {fullName(member)}
                </button>
                <p className="truncate text-sm text-muted-foreground">{secondaryLine(member, isSuperAdmin)}</p>
              </div>
              <GradeBadge licenseSummary={member.license_summary} />
              <div className="flex flex-wrap items-center gap-1.5">
                <LicenseStatusBadge licenseSummary={member.license_summary} />
                <InsuranceTiles insuranceSummary={member.insurance_summary} />
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

      {sortedMembers.length > 0 && (
        <div className="hidden overflow-hidden rounded-[18px] bg-card shadow-card md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3.5 font-semibold">Miembro</th>
                <th className="px-3 py-3.5 font-semibold">Grado</th>
                <th className="px-3 py-3.5 font-semibold">Licencia</th>
                <th className="px-3 py-3.5 font-semibold">Seguros</th>
                <th className="px-3 py-3.5 text-right font-semibold">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member) => (
                <tr key={member.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={fullName(member)} size="md" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="text-left font-bold text-foreground hover:underline"
                            onClick={() => openEdit(member)}
                          >
                            {fullName(member)}
                          </button>
                          <MemberStatusBadge status={member.status} />
                          {isSuperAdmin && <MemberAccessBadge hasAccount={memberIdsWithAccount.has(member.id || '')} />}
                        </div>
                        <p className="max-w-[12rem] truncate text-muted-foreground xl:max-w-[18rem]">
                          {secondaryLine(member, isSuperAdmin)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <GradeBadge licenseSummary={member.license_summary} />
                  </td>
                  <td className="px-3 py-3">
                    <LicenseStatusBadge licenseSummary={member.license_summary} />
                  </td>
                  <td className="px-3 py-3">
                    <InsuranceTiles insuranceSummary={member.insurance_summary} />
                  </td>
                  <td className="px-2 py-3 text-right">
                    <RowActions label={fullName(member)} actions={rowActions(member)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
