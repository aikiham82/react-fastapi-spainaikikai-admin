import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { toneClasses, toneIcons, type StatusTone } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
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

  const paidClubFee = data.payment_statuses.find((s) => s.payment_type === 'cuota_club' && s.is_paid);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium">Año {data.payment_year}</h3>
        <span className="text-sm text-muted-foreground">
          Total pagado: <span className="font-medium text-foreground">{formatCurrency(data.total_paid)}</span>
        </span>
      </div>

      <PaymentGroup
        title="Licencias"
        complete={data.has_all_licenses}
        missingTone="warn"
        payments={licensePayments.filter((status) => status.is_paid)}
        emptyLabel={`Sin licencia pagada en ${data.payment_year}`}
      />
      <PaymentGroup title="Seguros" complete={data.has_all_insurances} missingTone="neutral" payments={insurancePayments} />
      {paidClubFee && <PaymentGroup title="Club" complete missingTone="neutral" payments={[paidClubFee]} />}
    </div>
  );
};

interface ToneIconProps {
  tone: StatusTone;
}

const ToneIcon = ({ tone }: ToneIconProps) => {
  const Icon = toneIcons[tone];
  return (
    <span data-tone={tone} className={cn('mr-2 rounded-full', toneClasses[tone])}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
};

interface PaymentGroupProps {
  title: string;
  complete: boolean;
  missingTone: StatusTone;
  payments: { payment_type: string; is_paid: boolean; amount?: number | null }[];
  emptyLabel?: string;
}

const PaymentGroup: React.FC<PaymentGroupProps> = ({ title, complete, missingTone, payments, emptyLabel }) => (
  <div>
    <h4 className="mb-2 flex items-center text-sm font-medium">
      <ToneIcon tone={complete ? 'ok' : missingTone} />
      {title}
    </h4>
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {payments.map((status) => (
        <PaymentLine
          key={status.payment_type}
          label={MEMBER_PAYMENT_TYPES[status.payment_type as MemberPaymentType] || status.payment_type}
          tone={status.is_paid ? 'ok' : missingTone}
          amount={status.is_paid ? status.amount : null}
        />
      ))}
      {payments.length === 0 && emptyLabel && <PaymentLine label={emptyLabel} tone={missingTone} />}
    </div>
  </div>
);

interface PaymentLineProps {
  label: string;
  tone: StatusTone;
  amount?: number | null;
}

const PaymentLine: React.FC<PaymentLineProps> = ({ label, tone, amount }) => (
  <div className={cn('flex items-center justify-between rounded-md p-2', toneClasses[tone])}>
    <div className="flex items-center">
      <ToneIcon tone={tone} />
      <span className="text-sm text-foreground">{label}</span>
    </div>
    {amount != null && <span className="text-sm font-medium text-foreground">{formatCurrency(amount)}</span>}
  </div>
);
