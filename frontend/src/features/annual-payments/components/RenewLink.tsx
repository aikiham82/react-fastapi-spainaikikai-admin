import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RenewKind } from '../utils/payment-checklist';

interface RenewLinkProps {
  memberId: string;
  memberName: string;
  kind: RenewKind;
  className?: string;
}

export const RenewLink = ({ memberId, memberName, kind, className }: RenewLinkProps) => (
  <Button asChild variant="outline" className={className}>
    <Link to={`/payments?renovar=${encodeURIComponent(memberId)}&que=${kind}`} aria-label={`Renovar ${memberName}`}>
      <RefreshCw className="size-4" aria-hidden="true" />
      Renovar
    </Link>
  </Button>
);
