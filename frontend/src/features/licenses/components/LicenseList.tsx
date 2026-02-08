import { useState, useEffect } from 'react';
import { useLicenseContext } from '../hooks/useLicenseContext';
import { useDebounce } from '@/core/hooks/useDebounce';
import { useMemberContext } from '../../members/hooks/useMemberContext';
import type { License } from '../data/schemas/license.schema';
import { IdCard, Plus, Search, Trash2, Eye, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/core/hooks/usePermissions';
import { LicenseForm } from './LicenseForm';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

export const LicenseList = () => {
  const { licenses, isLoading, error, filters, setFilters, total, limit, offset, deleteLicense, selectLicense, setPagination } = useLicenseContext();
  const { members } = useMemberContext();
  const { canAccess } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [licenseStatusFilter, setLicenseStatusFilter] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLicenseForEdit, setSelectedLicenseForEdit] = useState<License | null>(null);
  const [licenseToDelete, setLicenseToDelete] = useState<License | null>(null);

  const memberOptions = members.map(member => ({
    id: member.id,
    name: `${member.first_name} ${member.last_name || ''}`.trim()
  }));

  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    setFilters({ ...filters, member_id: debouncedSearch || undefined, offset: 0 });
  }, [debouncedSearch]);

  const sortedLicenses = [...licenses].sort((a, b) =>
    (a.member_name || '').localeCompare(b.member_name || '', 'es')
  );

  const handleFilterStatus = (value: string) => {
    setLicenseStatusFilter(value);
    setFilters({ ...filters, status: value === 'all' ? undefined : value as "active" | "expired" | "pending", offset: 0 });
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
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
        <p className="text-red-500">Error al cargar las licencias</p>
        <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      </div>
    );
  }

  const hasActiveFilters = !!searchTerm || (!!licenseStatusFilter && licenseStatusFilter !== 'all');

  if (licenses.length === 0 && !hasActiveFilters) {
    return (
      <div className="text-center py-12">
        <IdCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay licencias</h3>
        <p className="text-gray-600 mb-4">No hay licencias registradas</p>
        {canAccess({ resource: 'licenses', action: 'create' }) && (
          <Button onClick={() => { setSelectedLicenseForEdit(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Licencia
          </Button>
        )}
        <LicenseForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          license={selectedLicenseForEdit}
          memberOptions={memberOptions}
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
            placeholder="Buscar licencias por nombre de miembro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={licenseStatusFilter || 'all'} onValueChange={handleFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado de licencia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Activa</SelectItem>
            <SelectItem value="expired">Expirada</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
          </SelectContent>
        </Select>

        {canAccess({ resource: 'licenses', action: 'create' }) && (
          <Button onClick={() => { setSelectedLicenseForEdit(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Licencia
          </Button>
        )}
      </div>

      {licenses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No se encontraron resultados para tu búsqueda</p>
        </div>
      ) : (
      <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sortedLicenses.map((license) => (
          <div key={license.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  <button
                    type="button"
                    className="text-left hover:text-primary hover:underline transition-colors cursor-pointer"
                    onClick={() => { setSelectedLicenseForEdit(license); setIsFormOpen(true); }}
                  >
                    {license.license_number}
                  </button>
                </h3>
                <p className="text-sm text-gray-600">{license.member_name || '-'}</p>
              </div>
              <Badge
                variant={
                  license.status === 'active' ? 'default' :
                    license.status === 'expired' ? 'destructive' : 'secondary'
                }
              >
                {license.status === 'active' ? 'Activa' :
                  license.status === 'expired' ? 'Expirada' : 'Pendiente'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span>Exp: {license.expiry_date ? new Date(license.expiry_date).toLocaleDateString('es-ES') : '-'}</span>
              <span>{license.dan_grade === 0 ? 'Kyû' : `Dan ${license.dan_grade}`}</span>
              {license.expiry_date && isExpiringSoon(license.expiry_date) && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                  <RotateCw className="w-3 h-3 mr-1" />
                  Expira pronto
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => selectLicense(license)} aria-label="Ver detalles de licencia">
                    <Eye className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Licencia {license.license_number}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Miembro</p>
                      <p className="text-sm text-gray-600">{license.member_name || '-'}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Fecha Emisión</p>
                        <p className="text-sm text-gray-600">{license.issue_date ? new Date(license.issue_date).toLocaleDateString('es-ES') : '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Fecha Expiración</p>
                        <p className="text-sm text-gray-600">{license.expiry_date ? new Date(license.expiry_date).toLocaleDateString('es-ES') : '-'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Grado</p>
                      <p className="text-sm text-gray-600">{license.dan_grade === 0 ? 'Kyû' : `Dan ${license.dan_grade}`}</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {canAccess({ resource: 'licenses', action: 'delete' }) && (
                <Button variant="ghost" size="icon" onClick={() => setLicenseToDelete(license)} aria-label="Eliminar licencia">
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
                <th className="text-left p-4 font-medium text-gray-900">Licencia</th>
                <th className="text-left p-4 font-medium text-gray-900">Miembro</th>
                <th className="text-left p-4 font-medium text-gray-900">Fecha Emisión</th>
                <th className="text-left p-4 font-medium text-gray-900">Fecha Expiración</th>
                <th className="text-left p-4 font-medium text-gray-900">Grado Dan</th>
                <th className="text-left p-4 font-medium text-gray-900">Estado</th>
                <th className="text-right p-4 font-medium text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedLicenses.map((license) => (
                <tr key={license.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <button
                      type="button"
                      className="text-left font-medium text-gray-900 hover:text-primary hover:underline transition-colors cursor-pointer"
                      onClick={() => { setSelectedLicenseForEdit(license); setIsFormOpen(true); }}
                    >
                      {license.license_number}
                    </button>
                  </td>
                  <td className="p-4 text-gray-600">{license.member_name || '-'}</td>
                  <td className="p-4 text-gray-600">
                    {license.issue_date ? new Date(license.issue_date).toLocaleDateString('es-ES') : '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">
                        {license.expiry_date ? new Date(license.expiry_date).toLocaleDateString('es-ES') : '-'}
                      </span>
                      {license.expiry_date && isExpiringSoon(license.expiry_date) && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                          <RotateCw className="w-3 h-3 mr-1" />
                          Expira pronto
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    {license.dan_grade === 0 ? 'Kyû' : `Dan ${license.dan_grade}`}
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={
                        license.status === 'active' ? 'default' :
                          license.status === 'expired' ? 'destructive' : 'secondary'
                      }
                    >
                      {license.status === 'active' ? 'Activa' :
                        license.status === 'expired' ? 'Expirada' : 'Pendiente'}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => selectLicense(license)} aria-label="Ver detalles de licencia">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Licencia {license.license_number}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">Miembro</p>
                              <p className="text-sm text-gray-600">{license.member_name || '-'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Fecha Emisión</p>
                                <p className="text-sm text-gray-600">
                                  {license.issue_date ? new Date(license.issue_date).toLocaleDateString('es-ES') : '-'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Fecha Expiración</p>
                                <p className="text-sm text-gray-600">
                                  {license.expiry_date ? new Date(license.expiry_date).toLocaleDateString('es-ES') : '-'}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Grado</p>
                              <p className="text-sm text-gray-600">
                                {license.dan_grade === 0 ? 'Kyû' : `Dan ${license.dan_grade}`}
                              </p>
                            </div>
                            <div>
                              <Badge
                                variant={
                                  license.status === 'active' ? 'default' :
                                    license.status === 'expired' ? 'destructive' : 'secondary'
                                }
                              >
                                {license.status === 'active' ? 'Activa' :
                                  license.status === 'expired' ? 'Expirada' : 'Pendiente'}
                              </Badge>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {canAccess({ resource: 'licenses', action: 'delete' }) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLicenseToDelete(license)}
                          aria-label="Eliminar licencia"
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
      </>
      )}

      {total > limit && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} licencias
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

      <LicenseForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        license={selectedLicenseForEdit}
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
