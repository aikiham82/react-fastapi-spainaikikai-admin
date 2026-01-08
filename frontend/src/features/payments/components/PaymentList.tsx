import { useState } from 'react';
import { usePaymentContext } from '../hooks/usePaymentContext';
import { CreditCard, Plus, Search, CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/core/hooks/usePermissions';
import type { Payment } from '../data/schemas/payment.schema';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  license: 'Licencia',
  accident_insurance: 'Seguro Accidentes',
  rc_insurance: 'Seguro RC',
  annual_fee: 'Cuota Anual',
  seminar: 'Seminario',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  failed: 'Fallido',
  refunded: 'Reembolsado',
};

export const PaymentList = () => {
  const { payments, isLoading, error, filters, setFilters, total, limit, offset, updatePaymentStatus, setPagination } = usePaymentContext();
  const { canAccess } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, member_id: value || undefined, offset: 0 });
  };

  const handleFilterPaymentType = (value: string) => {
    setPaymentTypeFilter(value);
    setFilters({ ...filters, payment_type: value || undefined, offset: 0 });
  };

  const handleFilterStatus = (value: string) => {
    setStatusFilter(value);
    setFilters({ ...filters, status: value || undefined, offset: 0 });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'refunded':
        return <RotateCcw className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
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
        <p className="text-red-500">Error al cargar los pagos</p>
        <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos</h3>
        <p className="text-gray-600 mb-4">
          {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'No hay pagos registrados'}
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
            placeholder="Buscar pagos por nombre de miembro..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-1">
          <Select value={paymentTypeFilter} onValueChange={handleFilterPaymentType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tipo de pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="license">Licencia</SelectItem>
              <SelectItem value="accident_insurance">Seguro Accidentes</SelectItem>
              <SelectItem value="rc_insurance">Seguro RC</SelectItem>
              <SelectItem value="annual_fee">Cuota Anual</SelectItem>
              <SelectItem value="seminar">Seminario</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={handleFilterStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
              <SelectItem value="failed">Fallido</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">Tipo</th>
                <th className="text-left p-4 font-medium text-gray-900">Miembro</th>
                <th className="text-left p-4 font-medium text-gray-900">Fecha</th>
                <th className="text-right p-4 font-medium text-gray-900">Monto</th>
                <th className="text-left p-4 font-medium text-gray-900">Estado</th>
                <th className="text-right p-4 font-medium text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium text-gray-900">
                      {PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type}
                    </p>
                    {payment.seminar_title && (
                      <p className="text-sm text-gray-600">{payment.seminar_title}</p>
                    )}
                  </td>
                  <td className="p-4 text-gray-600">{payment.member_name || '-'}</td>
                  <td className="p-4 text-gray-600">
                    {new Date(payment.payment_date).toLocaleDateString('es-ES')}
                  </td>
                  <td className="p-4 text-right font-medium text-gray-900">
                    {payment.amount.toFixed(2)} €
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <Badge
                        variant={
                          payment.status === 'completed' ? 'default' :
                          payment.status === 'failed' ? 'destructive' : 'secondary'
                        }
                      >
                        {STATUS_LABELS[payment.status] || payment.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    {canAccess({ resource: 'payments', action: 'update' }) && (
                      <Select
                        value={payment.status}
                        onValueChange={(value) =>
                          updatePaymentStatus(payment.id, { status: value })
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="completed">Completado</SelectItem>
                          <SelectItem value="failed">Fallido</SelectItem>
                          <SelectItem value="refunded">Reembolsado</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
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
            Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} pagos
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
    </div>
  );
};
