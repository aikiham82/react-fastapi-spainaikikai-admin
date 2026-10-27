import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RenewLinkProps {
  memberId: string;
  memberName: string;
  className?: string;
}

export const RenewLink = ({ memberId, memberName, className }: RenewLinkProps) => (
  <Button asChild variant="outline" className={className}>
    <Link to={`/payments?renovar=${encodeURIComponent(memberId)}`} aria-label={`Renovar ${memberName}`}>
      <RefreshCw className="size-4" aria-hidden="true" />
      Renovar
    </Link>
  </Button>
);
