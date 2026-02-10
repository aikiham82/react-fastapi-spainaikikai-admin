import { useState, useEffect, useMemo } from 'react';
import { useMemberContext } from '../hooks/useMemberContext';
import { useDebounce } from '@/core/hooks/useDebounce';
import type { Member } from '../data/schemas/member.schema';
import { Users, Plus, Search, Trash2, CreditCard, Loader2, MoreVertical, UserX, UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/core/hooks/usePermissions';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { useClubContext } from '@/features/clubs/hooks/useClubContext';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MemberForm } from './MemberForm';
import { MemberPaymentStatus } from '@/features/member-payments/components/MemberPaymentStatus';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { GradeBadge, LicenseStatusBadge, InsuranceStatusBadge, MemberStatusBadge } from './MemberBadges';
import { cn } from '@/lib/utils';

export const MemberList = () => {
  const { members, isLoading, isFetching, error, filters, setFilters, total, limit, offset, deleteMember, changeMemberStatus, setPagination } = useMemberContext();
  const { canAccess } = usePermissions();
  const { userRole } = useAuthContext();
  const { clubs } = useClubContext();
  const isSuperAdmin = userRole === 'super_admin';
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [licenseStatusFilter, setLicenseStatusFilter] = useState<string>('all');
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>('active');
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

  const activeClubName = useMemo(() => {
    if (!filters.club_id) return null;
    return clubs.find(c => c.id === filters.club_id)?.name ?? null;
  }, [filters.club_id, clubs]);

  useEffect(() => {
    setFilters({ ...filters, search: debouncedSearch || undefined, offset: 0 });
  }, [debouncedSearch]);

  useEffect(() => {
    const statusValue = memberStatusFilter === 'all' ? undefined : memberStatusFilter;
    setFilters({ ...filters, status: statusValue, offset: 0 });
  }, [memberStatusFilter]);

  const sortedMembers = [...members].sort((a, b) =>
    (a.first_name || '').localeCompare(b.first_name || '', 'es') || (a.last_name || '').localeCompare(b.last_name || '', 'es')
  );

  const handleFilterStatus = (value: string) => {
    setLicenseStatusFilter(value);
    const statusValue = value === 'all' ? undefined : value as "active" | "expired" | "pending";
    setFilters({ ...filters, license_status: statusValue, offset: 0 });
  };

  const handleClubFilter = (value: string) => {
    setClubFilter(value);
    setFilters({ ...filters, club_id: value || undefined, offset: 0 });
  };

  const clearClubFilter = () => {
    setClubFilter('');
    setFilters({ ...filters, club_id: undefined, offset: 0 });
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (isLoading && members.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error al cargar los miembros</p>
        <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      </div>
    );
  }

  if (members.length === 0 && !searchTerm && !licenseStatusFilter?.replace('all', '') && memberStatusFilter === 'active') {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">No hay miembros registrados</p>
        {canAccess({ resource: 'members', action: 'create' }) && (
          <Button onClick={() => { setSelectedMemberForEdit(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Miembro
          </Button>
        )}
        <MemberForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          member={selectedMemberForEdit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 w-full relative">
          {isFetching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          )}
          <Input
            type="text"
            placeholder="Buscar miembros por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={memberStatusFilter} onValueChange={setMemberStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado del miembro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={licenseStatusFilter} onValueChange={handleFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado de licencia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activa</SelectItem>
            <SelectItem value="expired">Expirada</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
          </SelectContent>
        </Select>

        {isSuperAdmin && (
          <SearchableSelect
            options={clubOptions}
            value={clubFilter}
            onValueChange={handleClubFilter}
            placeholder="Filtrar por club"
            searchPlaceholder="Buscar club..."
            emptyMessage="No se encontraron clubs."
            className="w-full sm:w-[240px]"
          />
        )}

        <div className="flex gap-2">
          {canAccess({ resource: 'members', action: 'create' }) && (
            <Button onClick={() => { setSelectedMemberForEdit(null); setIsFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Miembro
            </Button>
          )}
        </div>
      </div>

      {isSuperAdmin && activeClubName && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            Club: {activeClubName}
            <button
              type="button"
              onClick={clearClubFilter}
              className="ml-1 hover:text-destructive transition-colors"
              aria-label="Quitar filtro de club"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {members.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          {filters.club_id ? (
            <>
              <p className="text-gray-600 mb-4">No se encontraron miembros en este club</p>
              <Button variant="outline" onClick={clearClubFilter}>
                Limpiar filtro
              </Button>
            </>
          ) : (
            <p className="text-gray-600">No se encontraron resultados para tu búsqueda</p>
          )}
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sortedMembers.map((member) => (
          <div key={member.id} className={cn("border rounded-lg p-4 space-y-3", member.status === 'inactive' && "opacity-60")}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  <button
                    type="button"
                    className="text-left hover:text-primary hover:underline transition-colors cursor-pointer"
                    onClick={() => { setSelectedMemberForEdit(member); setIsFormOpen(true); }}
                  >
                    {member.first_name} {member.last_name}
                  </button>
                </h3>
                <p className="text-sm text-gray-600">{member.phone}</p>
                <p className="text-sm text-gray-600">{member.email}</p>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <MemberStatusBadge status={member.status} />
                <LicenseStatusBadge licenseSummary={member.license_summary} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {isSuperAdmin && (
                <>
                  {member.club_name ? (
                    <button
                      type="button"
                      className="hover:text-primary hover:underline transition-colors cursor-pointer"
                      onClick={() => handleClubFilter(member.club_id)}
                    >
                      {member.club_name}
                    </button>
                  ) : (
                    <span>-</span>
                  )}
                  <span className="text-gray-300">|</span>
                </>
              )}
              <GradeBadge licenseSummary={member.license_summary} compact />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Seguros:</span>
              <InsuranceStatusBadge insuranceSummary={member.insurance_summary} type="rc" />
              <InsuranceStatusBadge insuranceSummary={member.insurance_summary} type="accident" />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button variant="ghost" size="icon" onClick={() => setSelectedMemberForPayments(member)} aria-label="Ver pagos">
                <CreditCard className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Más acciones">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {member.status === 'active' ? (
                    <DropdownMenuItem onClick={() => setMemberToChangeStatus(member)}>
                      <UserX className="w-4 h-4 mr-2" />
                      Dar de baja
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setMemberToChangeStatus(member)}>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Reactivar
                    </DropdownMenuItem>
                  )}
                  {canAccess({ resource: 'members', action: 'delete' }) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setMemberToDelete(member)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">Nombre</th>
                <th className="text-left p-4 font-medium text-gray-900">Email</th>
                {isSuperAdmin && <th className="text-left p-4 font-medium text-gray-900">Club</th>}
                <th className="text-left p-4 font-medium text-gray-900">Grado</th>
                <th className="text-left p-4 font-medium text-gray-900">Seguro RC</th>
                <th className="text-left p-4 font-medium text-gray-900">Seguro Acc.</th>
                <th className="text-center p-4 font-medium text-gray-900">Pagos</th>
                <th className="text-right p-4 font-medium text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member) => (
                <tr key={member.id} className={cn("border-b hover:bg-gray-50", member.status === 'inactive' && "opacity-60")}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <button
                          type="button"
                          className="text-left font-medium text-gray-900 hover:text-primary hover:underline transition-colors cursor-pointer"
                          onClick={() => { setSelectedMemberForEdit(member); setIsFormOpen(true); }}
                        >
                          {member.first_name} {member.last_name}
                        </button>
                        <p className="text-sm text-gray-600">{member.phone}</p>
                      </div>
                      <MemberStatusBadge status={member.status} />
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{member.email}</td>
                  {isSuperAdmin && (
                    <td className="p-4 text-gray-600">
                      {member.club_name ? (
                        <button
                          type="button"
                          className="hover:text-primary hover:underline transition-colors cursor-pointer"
                          onClick={() => handleClubFilter(member.club_id)}
                        >
                          {member.club_name}
                        </button>
                      ) : '-'}
                    </td>
                  )}
                  <td className="p-4">
                    <div className="flex items-center gap-1 flex-wrap">
                      <GradeBadge licenseSummary={member.license_summary} />
                      <LicenseStatusBadge licenseSummary={member.license_summary} />
                    </div>
                  </td>
                  <td className="p-4">
                    <InsuranceStatusBadge insuranceSummary={member.insurance_summary} type="rc" />
                  </td>
                  <td className="p-4">
                    <InsuranceStatusBadge insuranceSummary={member.insurance_summary} type="accident" />
                  </td>
                  <td className="p-4 text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedMemberForPayments(member)}
                          >
                            <CreditCard className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver estado de pagos</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Más acciones">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.status === 'active' ? (
                            <DropdownMenuItem onClick={() => setMemberToChangeStatus(member)}>
                              <UserX className="w-4 h-4 mr-2" />
                              Dar de baja
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setMemberToChangeStatus(member)}>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Reactivar
                            </DropdownMenuItem>
                          )}
                          {canAccess({ resource: 'members', action: 'delete' }) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setMemberToDelete(member)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > limit && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} miembros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(Math.max(0, offset - limit), limit)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(offset + limit, limit)}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <MemberForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        member={selectedMemberForEdit}
      />

      {/* Payment Status Dialog */}
      <Dialog open={!!selectedMemberForPayments} onOpenChange={(open) => !open && setSelectedMemberForPayments(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Estado de Pagos - {selectedMemberForPayments?.first_name} {selectedMemberForPayments?.last_name}
            </DialogTitle>
          </DialogHeader>
          {selectedMemberForPayments && (
            <MemberPaymentStatus memberId={selectedMemberForPayments.id} />
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

      {/* Status Change Confirmation Dialog */}
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
