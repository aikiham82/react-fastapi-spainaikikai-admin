import { useState, useEffect } from 'react';
import { useInsuranceContext } from '../hooks/useInsuranceContext';
import { useDebounce } from '@/core/hooks/useDebounce';
import type { Insurance } from '../data/schemas/insurance.schema';
import { Shield, Plus, Search, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/core/hooks/usePermissions';
import { InsuranceForm } from './InsuranceForm';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { useMembersQuery } from '@/features/members/hooks/queries/useMemberQueries';

const INSURANCE_TYPE_LABELS: Record<string, string> = {
  accident: 'Seguro de Accidentes',
  rc: 'Seguro de Responsabilidad Civil',
  civil_liability: 'Responsabilidad Civil',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  expired: 'Expirada',
};

export const InsuranceList = () => {
  const { insuranceList, isLoading, error, filters, setFilters, total, limit, offset, deleteInsurance, selectInsurance, setPagination } = useInsuranceContext();
  const { canAccess } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [insuranceTypeFilter, setInsuranceTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInsuranceForEdit, setSelectedInsuranceForEdit] = useState<Insurance | null>(null);
  const [insuranceToDelete, setInsuranceToDelete] = useState<Insurance | null>(null);

  const { data: members = [] } = useMembersQuery();
  const memberOptions = members.map(m => ({
    id: m.id,
    name: `${m.first_name} ${m.last_name}`
  }));

  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    setFilters({ ...filters, member_id: debouncedSearch || undefined, offset: 0 });
  }, [debouncedSearch]);

  const handleFilterInsuranceType = (value: string) => {
    setInsuranceTypeFilter(value);
    setFilters({ ...filters, insurance_type: value === 'all' ? undefined : value as any, offset: 0 });
  };

  const handleFilterStatus = (value: string) => {
    setStatusFilter(value);
    setFilters({ ...filters, status: value === 'all' ? undefined : value as any, offset: 0 });
  };

  const isExpiringSoon = (endDate: string) => {
    const expiry = new Date(endDate);
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
        <p className="text-red-500">Error al cargar los seguros</p>
        <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      </div>
    );
  }

  const hasActiveFilters = !!searchTerm || (!!insuranceTypeFilter && insuranceTypeFilter !== 'all') || (!!statusFilter && statusFilter !== 'all');

  if (insuranceList.length === 0 && !hasActiveFilters) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay seguros</h3>
        <p className="text-gray-600 mb-4">No hay seguros registrados</p>
        {canAccess({ resource: 'insurance', action: 'create' }) && (
          <Button onClick={() => { setSelectedInsuranceForEdit(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Seguro
          </Button>
        )}
        <InsuranceForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          insurance={selectedInsuranceForEdit}
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
            placeholder="Buscar seguros por nombre de miembro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:flex-1">
          <Select value={insuranceTypeFilter || 'all'} onValueChange={handleFilterInsuranceType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo de seguro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="accident">Seguro Accidentes</SelectItem>
              <SelectItem value="rc">Seguro RC</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter || 'all'} onValueChange={handleFilterStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="expired">Expirada</SelectItem>
            </SelectContent>
          </Select>

          {canAccess({ resource: 'insurance', action: 'create' }) && (
            <Button onClick={() => { setSelectedInsuranceForEdit(null); setIsFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Seguro
            </Button>
          )}
        </div>
      </div>

      {insuranceList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No se encontraron resultados para tu búsqueda</p>
        </div>
      ) : (
      <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {insuranceList.map((insurance) => (
          <div key={insurance.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  <button
                    type="button"
                    className="text-left hover:text-primary hover:underline transition-colors cursor-pointer"
                    onClick={() => { setSelectedInsuranceForEdit(insurance); setIsFormOpen(true); }}
                  >
                    {INSURANCE_TYPE_LABELS[insurance.insurance_type] || insurance.insurance_type}
                  </button>
                </h3>
                <p className="text-sm text-gray-600">{insurance.member_name || '-'}</p>
                <p className="text-sm text-gray-600">Póliza: {insurance.policy_number}</p>
              </div>
              <Badge variant={insurance.status === 'active' ? 'default' : 'destructive'}>
                {STATUS_LABELS[insurance.status] || insurance.status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span>{new Date(insurance.start_date).toLocaleDateString('es-ES')} - {new Date(insurance.end_date).toLocaleDateString('es-ES')}</span>
              <span className="font-medium text-gray-900 tabular-nums">{insurance.coverage_amount?.toFixed(2) || '-'}€</span>
              {isExpiringSoon(insurance.end_date) && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-700">Expira pronto</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => selectInsurance(insurance)} aria-label="Ver detalles de seguro">
                    <Eye className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{INSURANCE_TYPE_LABELS[insurance.insurance_type] || 'Seguro'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Póliza</p>
                      <p className="text-sm text-gray-600">{insurance.policy_number}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Miembro</p>
                      <p className="text-sm text-gray-600">{insurance.member_name || '-'}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Fecha Inicio</p>
                        <p className="text-sm text-gray-600">{new Date(insurance.start_date).toLocaleDateString('es-ES')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Fecha Fin</p>
                        <p className="text-sm text-gray-600">{new Date(insurance.end_date).toLocaleDateString('es-ES')}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cobertura</p>
                      <p className="text-2xl font-bold text-gray-900 tabular-nums">{insurance.coverage_amount?.toFixed(2) || '-'}€</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {canAccess({ resource: 'insurance', action: 'delete' }) && (
                <Button variant="ghost" size="icon" onClick={() => setInsuranceToDelete(insurance)} aria-label="Eliminar seguro">
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
                <th className="text-left p-4 font-medium text-gray-900">Tipo</th>
                <th className="text-left p-4 font-medium text-gray-900">Póliza</th>
                <th className="text-left p-4 font-medium text-gray-900">Miembro</th>
                <th className="text-left p-4 font-medium text-gray-900">Fecha Inicio</th>
                <th className="text-left p-4 font-medium text-gray-900">Fecha Fin</th>
                <th className="text-right p-4 font-medium text-gray-900">Monto</th>
                <th className="text-left p-4 font-medium text-gray-900">Estado</th>
                <th className="text-right p-4 font-medium text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {insuranceList.map((insurance) => (
                <tr key={insurance.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <button
                      type="button"
                      className="text-left font-medium text-gray-900 hover:text-primary hover:underline transition-colors cursor-pointer"
                      onClick={() => { setSelectedInsuranceForEdit(insurance); setIsFormOpen(true); }}
                    >
                      {INSURANCE_TYPE_LABELS[insurance.insurance_type] || insurance.insurance_type}
                    </button>
                  </td>
                  <td className="p-4 text-gray-600">{insurance.policy_number}</td>
                  <td className="p-4 text-gray-600">{insurance.member_name || '-'}</td>
                  <td className="p-4 text-gray-600">
                    {new Date(insurance.start_date).toLocaleDateString('es-ES')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">
                        {new Date(insurance.end_date).toLocaleDateString('es-ES')}
                      </span>
                      {isExpiringSoon(insurance.end_date) && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                          Expira pronto
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right font-medium text-gray-900 tabular-nums">
                    {insurance.coverage_amount?.toFixed(2) || '-'}€
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={insurance.status === 'active' ? 'default' : 'destructive'}
                    >
                      {STATUS_LABELS[insurance.status] || insurance.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => selectInsurance(insurance)} aria-label="Ver detalles de seguro">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              {INSURANCE_TYPE_LABELS[insurance.insurance_type] || 'Seguro'}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">Póliza</p>
                              <p className="text-sm text-gray-600">{insurance.policy_number}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Miembro</p>
                              <p className="text-sm text-gray-600">{insurance.member_name || '-'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Fecha Inicio</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(insurance.start_date).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Fecha Fin</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(insurance.end_date).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Compañía</p>
                              <p className="text-sm text-gray-600">{insurance.insurance_company}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Cobertura</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {insurance.coverage_amount?.toFixed(2) || '-'}€
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Estado</p>
                              <Badge
                                variant={insurance.status === 'active' ? 'default' : 'destructive'}
                              >
                                {STATUS_LABELS[insurance.status] || insurance.status}
                              </Badge>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {canAccess({ resource: 'insurance', action: 'delete' }) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setInsuranceToDelete(insurance)}
                          aria-label="Eliminar seguro"
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
            Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} seguros
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

      <InsuranceForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        insurance={selectedInsuranceForEdit}
        memberOptions={memberOptions}
      />

      <ConfirmDeleteDialog
        open={!!insuranceToDelete}
        onOpenChange={(open) => !open && setInsuranceToDelete(null)}
        description={`Se eliminará permanentemente el seguro con póliza "${insuranceToDelete?.policy_number}". Esta acción no se puede deshacer.`}
        onConfirm={() => {
          if (insuranceToDelete) {
            deleteInsurance(insuranceToDelete.id);
            setInsuranceToDelete(null);
          }
        }}
      />
    </div>
  );
};
