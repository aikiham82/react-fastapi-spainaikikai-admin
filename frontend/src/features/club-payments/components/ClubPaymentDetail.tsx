import { useState } from 'react';
import { useClubPaymentsContext } from '../hooks/useClubPaymentsContext';
import { ArrowLeft, Search, Users, IdCard, Shield, Wallet, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

type StatusFilter = 'all' | 'paid' | 'pending';

export const ClubPaymentDetail = () => {
  const {
    isSuperAdmin,
    clubDetail,
    isLoadingClubDetail,
    clubDetailError,
    goBackToList,
  } = useClubPaymentsContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  if (isLoadingClubDetail) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (clubDetailError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error al cargar los datos del club</p>
        <p className="text-sm text-gray-600 mt-2">{clubDetailError.message}</p>
      </div>
    );
  }

  if (!clubDetail) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No se encontraron datos de pagos</p>
      </div>
    );
  }

  const members = clubDetail.members ?? [];
  const membersWithPayment = members.filter((m) => m.total_paid > 0).length;

  const filtered = members.filter((m) => {
    const matchesSearch = m.member_name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasPaid = m.total_paid > 0;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paid' && hasPaid) ||
      (statusFilter === 'pending' && !hasPaid);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Back button (Super Admin only) */}
      {isSuperAdmin && (
        <Button variant="ghost" onClick={goBackToList} className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />
          Volver al listado
        </Button>
      )}

      {/* Club name */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{clubDetail.club_name}</h3>
        <p className="text-sm text-gray-600">Ano {clubDetail.payment_year}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-green-600" />
            <p className="text-sm text-gray-600">Total Cobrado</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(clubDetail.total_collected)}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-gray-600">Miembros Pagados</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {membersWithPayment}/{clubDetail.total_members}
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <IdCard className="w-4 h-4 text-purple-600" />
            <p className="text-sm text-gray-600">Licencias Activas</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{clubDetail.members_with_license}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-orange-600" />
            <p className="text-sm text-gray-600">Seguros Activos</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{clubDetail.members_with_insurance}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar miembro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Pagados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((member) => {
          const hasPaid = member.total_paid > 0;
          return (
            <div key={member.member_id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-gray-900">{member.member_name}</h3>
                <Badge variant={hasPaid ? 'default' : 'destructive'}>
                  {hasPaid ? 'Pagado' : 'Pendiente'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Licencia:</span>
                  {member.license_paid ? (
                    <Check className="w-4 h-4 text-green-600" aria-label="Pagado" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" aria-label="Pendiente" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Seguro:</span>
                  {member.insurance_paid ? (
                    <Check className="w-4 h-4 text-green-600" aria-label="Pagado" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" aria-label="Pendiente" />
                  )}
                </div>
              </div>
              {member.total_paid > 0 && (
                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="text-gray-600">Total pagado:</span>
                  <span className="font-medium text-gray-900 tabular-nums">
                    {formatCurrency(member.total_paid)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">Miembro</th>
                <th className="text-center p-4 font-medium text-gray-900">Licencia</th>
                <th className="text-center p-4 font-medium text-gray-900">Seguro</th>
                <th className="text-right p-4 font-medium text-gray-900">Total Pagado</th>
                <th className="text-center p-4 font-medium text-gray-900">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => {
                const hasPaid = member.total_paid > 0;
                return (
                  <tr key={member.member_id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{member.member_name}</p>
                    </td>
                    <td className="p-4 text-center">
                      {member.license_paid ? (
                        <Check className="w-5 h-5 text-green-600 mx-auto" aria-label="Pagado" />
                      ) : (
                        <X className="w-5 h-5 text-red-400 mx-auto" aria-label="Pendiente" />
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {member.insurance_paid ? (
                        <Check className="w-5 h-5 text-green-600 mx-auto" aria-label="Pagado" />
                      ) : (
                        <X className="w-5 h-5 text-red-400 mx-auto" aria-label="Pendiente" />
                      )}
                    </td>
                    <td className="p-4 text-right font-medium text-gray-900 tabular-nums">
                      {member.total_paid > 0 ? formatCurrency(member.total_paid) : '-'}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={hasPaid ? 'default' : 'destructive'}>
                        {hasPaid ? 'Pagado' : 'Pendiente'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No se encontraron miembros con los filtros seleccionados</p>
        </div>
      )}
    </div>
  );
};
