import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { defaultPaymentYear, seasonLabel } from '@/core/utils/defaultPaymentYear';
import type { RenewKind } from '../utils/payment-checklist';

interface RenewLinkProps {
  memberId: string;
  memberName: string;
  kind: RenewKind;
  className?: string;
}

export const RenewLink = ({ memberId, memberName, kind, className }: RenewLinkProps) => {
  const year = defaultPaymentYear(new Date());
  const period = kind === 'licencia' ? String(year) : seasonLabel(year);
  return (
    <Button asChild variant="outline" className={className}>
      <Link
        to={`/payments?renovar=${encodeURIComponent(memberId)}&que=${kind}&anio=${year}`}
        aria-label={`Renovar ${period} ${memberName}`}
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        Renovar {period}
      </Link>
    </Button>
  );
};
