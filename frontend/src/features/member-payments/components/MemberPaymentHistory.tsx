import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, History } from 'lucide-react';
import { useMemberPaymentHistoryQuery } from '../hooks/queries/useMemberPaymentQueries';
import {
  MEMBER_PAYMENT_TYPES,
  MEMBER_PAYMENT_STATUS,
  type MemberPaymentType,
  type MemberPaymentStatus,
} from '../data/schemas/member-payment.schema';

interface MemberPaymentHistoryProps {
  memberId: string;
  limit?: number;
}

export const MemberPaymentHistory: React.FC<MemberPaymentHistoryProps> = ({
  memberId,
  limit = 50,
}) => {
  const { data, isLoading, error } = useMemberPaymentHistoryQuery(memberId, limit);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center text-destructive">
            <AlertCircle className="mr-2 h-5 w-5" />
            Error al cargar el historial de pagos
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Historial de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No hay pagos registrados para este miembro.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Historial de Pagos
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {data.total_count} registros
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Año</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Importe</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">
                  {payment.payment_year}
                </TableCell>
                <TableCell>
                  {MEMBER_PAYMENT_TYPES[payment.payment_type as MemberPaymentType] ||
                    payment.payment_type}
                </TableCell>
                <TableCell>{payment.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <StatusBadge status={payment.status as MemberPaymentStatus} />
                </TableCell>
                <TableCell>
                  {payment.created_at
                    ? new Date(payment.created_at).toLocaleDateString('es-ES')
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

interface StatusBadgeProps {
  status: MemberPaymentStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
    completed: 'default',
    pending: 'secondary',
    refunded: 'destructive',
  };

  return (
    <Badge variant={variants[status] || 'secondary'}>
      {MEMBER_PAYMENT_STATUS[status] || status}
    </Badge>
  );
};
