import { useState } from 'react';
import { useMemberContext } from '../hooks/useMemberContext';
import type { Member } from '../data/schemas/member.schema';
import { Users, Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/core/hooks/usePermissions';
import { MemberForm } from './MemberForm';

export const MemberList = () => {
  const { members, isLoading, error, filters, setFilters, total, limit, offset, deleteMember, selectMember, setPagination } = useMemberContext();
  const { canAccess, clubId } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [licenseStatusFilter, setLicenseStatusFilter] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<Member | null>(null);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, search: value || undefined, offset: 0 });
  };

  const handleFilterStatus = (value: string) => {
    setLicenseStatusFilter(value);
    setFilters({ ...filters, license_status: value || undefined, offset: 0 });
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay miembros</h3>
        <p className="text-gray-600 mb-4">
          {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'No hay miembros registrados'}
        </p>
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
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={licenseStatusFilter} onValueChange={handleFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado de licencia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
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

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">Nombre</th>
                <th className="text-left p-4 font-medium text-gray-900">Email</th>
                <th className="text-left p-4 font-medium text-gray-900">Club</th>
                <th className="text-left p-4 font-medium text-gray-900">Licencia</th>
                <th className="text-left p-4 font-medium text-gray-900">Estado</th>
                <th className="text-right p-4 font-medium text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{member.phone}</p>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{member.email}</td>
                  <td className="p-4 text-gray-600">{member.club_name || '-'}</td>
                  <td className="p-4 text-gray-600">{member.license_number || '-'}</td>
                  <td className="p-4">
                    <Badge
                      variant={
                        member.license_status === 'active' ? 'default' :
                        member.license_status === 'expired' ? 'destructive' : 'secondary'
                      }
                    >
                      {member.license_status === 'active' ? 'Activa' :
                       member.license_status === 'expired' ? 'Expirada' : 'Pendiente'}
                    </Badge>
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
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
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
                              <p className="text-sm text-gray-600">
                                {member.postal_code}, {member.city}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Fecha de Nacimiento</p>
                              <p className="text-sm text-gray-600">
                                {new Date(member.date_of_birth).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Licencia</p>
                                <p className="text-sm text-gray-600">
                                  {member.license_number || 'Sin licencia'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Estado</p>
                                <Badge
                                  variant={
                                    member.license_status === 'active' ? 'default' :
                                    member.license_status === 'expired' ? 'destructive' : 'secondary'
                                  }
                                >
                                  {member.license_status === 'active' ? 'Activa' :
                                   member.license_status === 'expired' ? 'Expirada' : 'Pendiente'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {canAccess({ resource: 'members', action: 'update' }) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelectedMemberForEdit(member); setIsFormOpen(true); }}
                          aria-label="Editar miembro"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}

                      {canAccess({ resource: 'members', action: 'delete' }) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar a "${member.first_name} ${member.last_name}"?`)) {
                              deleteMember(member.id);
                            }
                          }}
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
        <div className="flex items-center justify-between">
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
    </div>
  );
};
