import type { StatusTone } from '@/components/ui/status-badge';

const STATUS_TONES: Record<string, StatusTone> = {
  completed: 'ok',
  pending: 'warn',
  refunded: 'bad',
};

export const paymentStatusTone = (status: string): StatusTone => STATUS_TONES[status] ?? 'neutral';
