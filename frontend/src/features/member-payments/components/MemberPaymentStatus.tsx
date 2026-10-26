import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useMemberPaymentStatusQuery } from '../hooks/queries/useMemberPaymentQueries';
import { MEMBER_PAYMENT_TYPES, type MemberPaymentType } from '../data/schemas/member-payment.schema';
import { formatCurrency } from '@/core/utils/format';

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
      <div role="status" aria-label="Cargando pagos" className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center text-danger">
        <AlertCircle className="mr-2 h-5 w-5" />
        No se ha podido cargar el estado de pagos
      </div>
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
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium">Año {data.payment_year}</h3>
        <span className="text-sm text-muted-foreground">
          Total pagado: <span className="font-medium text-foreground">{formatCurrency(data.total_paid)}</span>
        </span>
      </div>

      <PaymentGroup title="Licencias" complete={data.has_all_licenses} payments={licensePayments} />
      <PaymentGroup title="Seguros" complete={data.has_all_insurances} payments={insurancePayments} />
    </div>
  );
};

interface PaymentGroupProps {
  title: string;
  complete: boolean;
  payments: { payment_type: string; is_paid: boolean; amount?: number | null }[];
}

const PaymentGroup: React.FC<PaymentGroupProps> = ({ title, complete, payments }) => (
  <div>
    <h4 className="mb-2 flex items-center text-sm font-medium">
      {complete ? (
        <CheckCircle className="mr-2 h-4 w-4 text-success" />
      ) : (
        <XCircle className="mr-2 h-4 w-4 text-danger" />
      )}
      {title}
    </h4>
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {payments.map((status) => (
        <PaymentTypeItem
          key={status.payment_type}
          paymentType={status.payment_type}
          isPaid={status.is_paid}
          amount={status.amount}
        />
      ))}
    </div>
  </div>
);

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
        isPaid ? 'bg-success-soft' : 'bg-danger-soft'
      }`}
    >
      <div className="flex items-center">
        {isPaid ? (
          <CheckCircle className="mr-2 h-4 w-4 text-success" />
        ) : (
          <XCircle className="mr-2 h-4 w-4 text-danger" />
        )}
        <span className="text-sm">{label}</span>
      </div>
      {isPaid && amount != null && (
        <span className="text-sm font-medium">{formatCurrency(amount)}</span>
      )}
    </div>
  );
};
