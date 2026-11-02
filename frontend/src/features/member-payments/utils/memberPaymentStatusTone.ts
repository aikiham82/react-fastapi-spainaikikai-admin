import type { StatusTone } from '@/components/ui/status-badge';
import type { MemberPaymentStatus } from '../data/schemas/member-payment.schema';

const STATUS_TONES: Record<MemberPaymentStatus, StatusTone> = {
  completed: 'ok',
  pending: 'warn',
  refunded: 'bad',
};

export const memberPaymentStatusTone = (status: string): StatusTone =>
  STATUS_TONES[status as MemberPaymentStatus] ?? 'neutral';
