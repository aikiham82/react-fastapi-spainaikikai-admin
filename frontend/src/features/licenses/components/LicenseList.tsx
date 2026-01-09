import { useState } from 'react';
import { useLicenseContext } from '../hooks/useLicenseContext';
import type { License } from '../data/schemas/license.schema';
import { IdCard, Plus, Search, Edit, Trash2, Eye, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/core/hooks/usePermissions';
import { LicenseForm } from './LicenseForm';

export const LicenseList = () => {
  const { licenses, isLoading, error, filters, setFilters, total, limit, offset, deleteLicense, selectLicense, setPagination } = useLicenseContext();
  const { canAccess } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [licenseStatusFilter, setLicenseStatusFilter] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLicenseForEdit, setSelectedLicenseForEdit] = useState<License | null>(null);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, member_id: value || undefined, offset: 0 });
  };

  const handleFilterStatus = (value: string) => {
    setLicenseStatusFilter(value);
    setFilters({ ...filters, status: value as "active" | "expired" | "pending" | undefined, offset: 0 });
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

  if (licenses.length === 0) {
    return (
      <div className="text-center py-12">
        <IdCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay licencias</h3>
        <p className="text-gray-600 mb-4">
          {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'No hay licencias registradas'}
        </p>
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
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={licenseStatusFilter} onValueChange={handleFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado de licencia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
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

      <div className="rounded-md border">
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
              {licenses.map((license) => (
                <tr key={license.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium text-gray-900">{license.license_number}</p>
                  </td>
                  <td className="p-4 text-gray-600">{license.member_name || '-'}</td>
                  <td className="p-4 text-gray-600">
                    {new Date(license.issue_date).toLocaleDateString('es-ES')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">
                        {new Date(license.expiry_date).toLocaleDateString('es-ES')}
                      </span>
                      {isExpiringSoon(license.expiry_date) && (
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
                                  {new Date(license.issue_date).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Fecha Expiración</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(license.expiry_date).toLocaleDateString('es-ES')}
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

                      {canAccess({ resource: 'licenses', action: 'update' }) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelectedLicenseForEdit(license); setIsFormOpen(true); }}
                          aria-label="Editar licencia"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}

                      {canAccess({ resource: 'licenses', action: 'delete' }) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar la licencia "${license.license_number}"?`)) {
                              deleteLicense(license.id);
                            }
                          }}
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

      {total > limit && (
        <div className="flex items-center justify-between">
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
      />
    </div>
  );
};
