import { useState, useEffect } from 'react';
import { useMemberContext } from '../hooks/useMemberContext';
import { useDebounce } from '@/core/hooks/useDebounce';
import type { Member } from '../data/schemas/member.schema';
import { Users, Plus, Search, Trash2, Eye, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { usePermissions } from '@/core/hooks/usePermissions';
import { MemberForm } from './MemberForm';
import { MemberPaymentStatus } from '@/features/member-payments/components/MemberPaymentStatus';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { GradeBadge, LicenseStatusBadge, InsuranceStatusBadge } from './MemberBadges';

function MemberQuickViewContent({ member }: { member: Member }) {
  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Email</p>
          <p className="text-sm text-gray-600">{member.email}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Teléfono</p>
          <p className="text-sm text-gray-600">{member.phone}</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">Dirección</p>
        <p className="text-sm text-gray-600">{member.address}</p>
        <p className="text-sm text-gray-600">{member.postal_code}, {member.city}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">Fecha de Nacimiento</p>
        <p className="text-sm text-gray-600">
          {member.birth_date
            ? new Date(member.birth_date).toLocaleDateString('es-ES')
            : 'No especificada'}
        </p>
      </div>

      <Separator />

      <div>
        <p className="text-sm font-medium text-gray-900 mb-2">Licencia</p>
        <div className="flex items-center gap-2 flex-wrap">
          <GradeBadge licenseSummary={member.license_summary} />
          <LicenseStatusBadge licenseSummary={member.license_summary} />
        </div>
        {member.license_summary?.expiration_date && (
          <p className="text-xs text-gray-500 mt-1">
            Vence: {new Date(member.license_summary.expiration_date).toLocaleDateString('es-ES')}
          </p>
        )}
      </div>

      <Separator />

      <div>
        <p className="text-sm font-medium text-gray-900 mb-2">Seguros</p>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 mb-1">Responsabilidad Civil</p>
            <InsuranceStatusBadge insuranceSummary={member.insurance_summary} type="rc" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Accidentes</p>
            <InsuranceStatusBadge insuranceSummary={member.insurance_summary} type="accident" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const MemberList = () => {
  const { members, isLoading, error, filters, setFilters, total, limit, offset, deleteMember, selectMember, setPagination } = useMemberContext();
  const { canAccess } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [licenseStatusFilter, setLicenseStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<Member | null>(null);
  const [selectedMemberForPayments, setSelectedMemberForPayments] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  useEffect(() => {
    setFilters({ ...filters, search: debouncedSearch || undefined, offset: 0 });
  }, [debouncedSearch]);

  const handleFilterStatus = (value: string) => {
    setLicenseStatusFilter(value);
    const statusValue = value === 'all' ? undefined : value as "active" | "expired" | "pending";
    setFilters({ ...filters, license_status: statusValue, offset: 0 });
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  if (isLoading) {
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

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">
          {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'No hay miembros registrados'}
        </p>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar miembros por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

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

        <div className="flex gap-2">
          {canAccess({ resource: 'members', action: 'create' }) && (
            <Button onClick={() => { setSelectedMemberForEdit(null); setIsFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Miembro
            </Button>
          )}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {members.map((member) => (
          <div key={member.id} className="border rounded-lg p-4 space-y-3">
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
              <LicenseStatusBadge licenseSummary={member.license_summary} />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{member.club_name || '-'}</span>
              <span className="text-gray-300">|</span>
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
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => selectMember(member)} aria-label="Ver detalles del miembro">
                    <Eye className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{member.first_name} {member.last_name}</DialogTitle>
                  </DialogHeader>
                  <MemberQuickViewContent member={member} />
                </DialogContent>
              </Dialog>
              {canAccess({ resource: 'members', action: 'delete' }) && (
                <Button variant="ghost" size="icon" onClick={() => setMemberToDelete(member)} aria-label="Eliminar miembro">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              )}
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
                <th className="text-left p-4 font-medium text-gray-900">Club</th>
                <th className="text-left p-4 font-medium text-gray-900">Grado</th>
                <th className="text-left p-4 font-medium text-gray-900">Seguro RC</th>
                <th className="text-left p-4 font-medium text-gray-900">Seguro Acc.</th>
                <th className="text-center p-4 font-medium text-gray-900">Pagos</th>
                <th className="text-right p-4 font-medium text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
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
                  </td>
                  <td className="p-4 text-gray-600">{member.email}</td>
                  <td className="p-4 text-gray-600">{member.club_name || '-'}</td>
                  <td className="p-4">
                    <GradeBadge licenseSummary={member.license_summary} />
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
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => selectMember(member)} aria-label="Ver detalles del miembro">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              {member.first_name} {member.last_name}
                            </DialogTitle>
                          </DialogHeader>
                          <MemberQuickViewContent member={member} />
                        </DialogContent>
                      </Dialog>

                      {canAccess({ resource: 'members', action: 'delete' }) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setMemberToDelete(member)}
                          aria-label="Eliminar miembro"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
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
    </div>
  );
};
