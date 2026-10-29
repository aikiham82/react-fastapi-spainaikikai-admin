import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMemberQuery } from '@/features/members/hooks/queries/useMemberQueries';
import { MemberPaymentLines } from '@/features/club-payments/components/MemberPaymentLines';
import { MemberPaymentStatus } from './MemberPaymentStatus';

interface MemberPaymentsDialogProps {
  memberId: string | null;
  memberName: string;
  club?: { id: string; name: string };
  onClose: () => void;
}

export function MemberPaymentsDialog({ memberId, memberName, club, onClose }: MemberPaymentsDialogProps) {
  const { data: member } = useMemberQuery(club ? '' : memberId ?? '');
  const clubId = club?.id ?? member?.club_id ?? '';
  const clubName = club?.name ?? member?.club_name ?? '';

  return (
    <Dialog open={!!memberId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">Pagos de {memberName}</DialogTitle>
        </DialogHeader>
        {memberId && (
          <>
            <MemberPaymentStatus memberId={memberId} />
            <MemberPaymentLines memberId={memberId} memberName={memberName} clubId={clubId} clubName={clubName} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
