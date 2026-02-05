import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface PaymentStatusBadgeProps {
  hasLicense: boolean;
  hasInsurance: boolean;
  showDetails?: boolean;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  hasLicense,
  hasInsurance,
  showDetails = false,
}) => {
  const isFullyPaid = hasLicense && hasInsurance;
  const isPartiallyPaid = hasLicense || hasInsurance;

  if (isFullyPaid) {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-600">
        <CheckCircle className="mr-1 h-3 w-3" />
        {showDetails ? 'Pagos completos' : 'Al día'}
      </Badge>
    );
  }

  if (isPartiallyPaid) {
    return (
      <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-500">
        <Clock className="mr-1 h-3 w-3" />
        {showDetails
          ? `Parcial (${hasLicense ? 'Lic.' : ''}${hasInsurance ? 'Seg.' : ''})`
          : 'Parcial'}
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      <XCircle className="mr-1 h-3 w-3" />
      {showDetails ? 'Sin pagos' : 'Pendiente'}
    </Badge>
  );
};

// Simple variant for inline use
interface SimplePaymentStatusProps {
  isPaid: boolean;
}

export const SimplePaymentStatus: React.FC<SimplePaymentStatusProps> = ({ isPaid }) => {
  if (isPaid) {
    return (
      <span className="flex items-center text-green-600">
        <CheckCircle className="mr-1 h-4 w-4" />
        Pagado
      </span>
    );
  }

  return (
    <span className="flex items-center text-red-500">
      <XCircle className="mr-1 h-4 w-4" />
      Pendiente
    </span>
  );
};
