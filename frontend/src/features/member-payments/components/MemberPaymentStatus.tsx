import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useMemberPaymentStatusQuery } from '../hooks/queries/useMemberPaymentQueries';
import { MEMBER_PAYMENT_TYPES, type MemberPaymentType } from '../data/schemas/member-payment.schema';

interface MemberPaymentStatusProps {
  memberId: string;
  paymentYear?: number;
}

export const MemberPaymentStatus: React.FC<MemberPaymentStatusProps> = ({
  memberId,
  paymentYear,
}) => {
  const { data, isLoading, error } = useMemberPaymentStatusQuery(memberId, paymentYear);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
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
            Error al cargar el estado de pagos
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const licensePayments = data.payment_statuses.filter(
    (s) =>
      s.payment_type.startsWith('licencia_') ||
      s.payment_type.startsWith('titulo_')
  );

  const insurancePayments = data.payment_statuses.filter(
    (s) => s.payment_type.startsWith('seguro_')
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Estado de Pagos {data.payment_year}</span>
          <span className="text-lg font-normal text-muted-foreground">
            Total pagado: {data.total_paid.toFixed(2)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* License Section */}
          <div>
            <h4 className="font-medium mb-3 flex items-center">
              {data.has_all_licenses ? (
                <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="mr-2 h-5 w-5 text-red-500" />
              )}
              Licencias
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {licensePayments.map((status) => (
                <PaymentTypeItem
                  key={status.payment_type}
                  paymentType={status.payment_type}
                  isPaid={status.is_paid}
                  amount={status.amount}
                />
              ))}
            </div>
          </div>

          {/* Insurance Section */}
          <div>
            <h4 className="font-medium mb-3 flex items-center">
              {data.has_all_insurances ? (
                <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="mr-2 h-5 w-5 text-red-500" />
              )}
              Seguros
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {insurancePayments.map((status) => (
                <PaymentTypeItem
                  key={status.payment_type}
                  paymentType={status.payment_type}
                  isPaid={status.is_paid}
                  amount={status.amount}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface PaymentTypeItemProps {
  paymentType: string;
  isPaid: boolean;
  amount?: number | null;
}

const PaymentTypeItem: React.FC<PaymentTypeItemProps> = ({
  paymentType,
  isPaid,
  amount,
}) => {
  const label = MEMBER_PAYMENT_TYPES[paymentType as MemberPaymentType] || paymentType;

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-md ${
        isPaid ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'
      }`}
    >
      <div className="flex items-center">
        {isPaid ? (
          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="mr-2 h-4 w-4 text-red-500" />
        )}
        <span className="text-sm">{label}</span>
      </div>
      {isPaid && amount != null && (
        <span className="text-sm font-medium">{amount.toFixed(2)}</span>
      )}
    </div>
  );
};
