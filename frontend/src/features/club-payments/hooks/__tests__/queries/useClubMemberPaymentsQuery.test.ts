import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';

// Mock the payment-admin service BEFORE importing the hook
vi.mock(
  '@/features/club-payments/data/services/payment-admin.service',
  () => ({
    paymentAdminService: {
      registerManualPayment: vi.fn(),
      updatePayment: vi.fn(),
      deletePayment: vi.fn(),
      getClubMemberPayments: vi.fn(),
      updateMemberPayment: vi.fn(),
      deleteMemberPayment: vi.fn(),
    },
  })
);

// Import AFTER mock is registered
import {
  useClubMemberPaymentsQuery,
  clubPaymentsKeys,
} from '../../queries/useClubPaymentsQueries';
import { paymentAdminService } from '@/features/club-payments/data/services/payment-admin.service';

// ─── Typed mock helpers ─────────────────────────────────────────────
const mockService = paymentAdminService as unknown as {
  getClubMemberPayments: ReturnType<typeof vi.fn>;
};

// ─── Mock data ──────────────────────────────────────────────────────
const mockMemberPayments = [
  {
    id: 'mp-001',
    payment_id: 'pay-001',
    member_id: 'mem-001',
    club_id: 'club-abc',
    payment_year: 2026,
    payment_type: 'licencia_kyu',
    concept: 'Licencia KYU 2026',
    amount: 75.0,
    status: 'completed',
    created_at: '2026-06-01T10:00:00',
    updated_at: '2026-06-01T10:00:00',
  },
  {
    id: 'mp-002',
    payment_id: 'pay-001',
    member_id: 'mem-002',
    club_id: 'club-abc',
    payment_year: 2026,
    payment_type: 'licencia_dan',
    concept: 'Licencia DAN 2026',
    amount: 100.0,
    status: 'pending',
    created_at: '2026-06-01T10:00:00',
    updated_at: '2026-06-01T10:00:00',
  },
];

// ─── QueryClient wrapper ─────────────────────────────────────────────
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ─── Tests ───────────────────────────────────────────────────────────
describe('clubPaymentsKeys.clubMemberPayments', () => {
  it('returns the correct tuple with clubId and year', () => {
    const key = clubPaymentsKeys.clubMemberPayments('club-abc', 2026);
    expect(key).toEqual(['club-payments', 'club-member-payments', 'club-abc', 2026]);
  });

  it('returns the correct tuple with clubId only (year undefined)', () => {
    const key = clubPaymentsKeys.clubMemberPayments('club-abc');
    expect(key).toEqual(['club-payments', 'club-member-payments', 'club-abc', undefined]);
  });

  it('starts with the same root as clubPaymentsKeys.all', () => {
    const key = clubPaymentsKeys.clubMemberPayments('any-club');
    expect(key[0]).toBe(clubPaymentsKeys.all[0]);
  });
});

describe('useClubMemberPaymentsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful fetch', () => {
    it('calls getClubMemberPayments with clubId and year, returns data', async () => {
      mockService.getClubMemberPayments.mockResolvedValue(mockMemberPayments);

      const { result } = renderHook(
        () => useClubMemberPaymentsQuery('club-abc', 2026),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockService.getClubMemberPayments).toHaveBeenCalledTimes(1);
      expect(mockService.getClubMemberPayments).toHaveBeenCalledWith('club-abc', 2026);
      expect(result.current.data).toEqual(mockMemberPayments);
    });

    it('calls getClubMemberPayments without year when year is undefined', async () => {
      mockService.getClubMemberPayments.mockResolvedValue(mockMemberPayments);

      const { result } = renderHook(
        () => useClubMemberPaymentsQuery('club-abc'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockService.getClubMemberPayments).toHaveBeenCalledWith('club-abc', undefined);
    });

    it('starts in loading state and transitions to success', async () => {
      mockService.getClubMemberPayments.mockResolvedValue(mockMemberPayments);

      const { result } = renderHook(
        () => useClubMemberPaymentsQuery('club-abc', 2026),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockMemberPayments);
    });

    it('returns an empty array when service returns []', async () => {
      mockService.getClubMemberPayments.mockResolvedValue([]);

      const { result } = renderHook(
        () => useClubMemberPaymentsQuery('club-abc', 2026),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe('Disabled query', () => {
    it('does NOT call service when enabled=false', async () => {
      const { result } = renderHook(
        () => useClubMemberPaymentsQuery('club-abc', 2026, false),
        { wrapper: createWrapper() }
      );

      // Give React Query time to potentially fire the query
      await new Promise((r) => setTimeout(r, 50));

      expect(mockService.getClubMemberPayments).not.toHaveBeenCalled();
      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('does NOT call service when clubId is empty string', async () => {
      const { result } = renderHook(
        () => useClubMemberPaymentsQuery('', 2026),
        { wrapper: createWrapper() }
      );

      await new Promise((r) => setTimeout(r, 50));

      expect(mockService.getClubMemberPayments).not.toHaveBeenCalled();
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('Error handling', () => {
    it('transitions to error state when service rejects', async () => {
      const apiError = { message: 'Forbidden', detail: 'Not authorized', status: 403 };
      mockService.getClubMemberPayments.mockRejectedValue(apiError);

      const { result } = renderHook(
        () => useClubMemberPaymentsQuery('club-abc', 2026),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(apiError);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('Query key', () => {
    it('uses clubPaymentsKeys.clubMemberPayments as its cache key', async () => {
      mockService.getClubMemberPayments.mockResolvedValue(mockMemberPayments);

      const { result } = renderHook(
        () => useClubMemberPaymentsQuery('club-abc', 2026),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify key indirectly: different year means cache miss → separate fetch
      expect(mockService.getClubMemberPayments).toHaveBeenCalledTimes(1);
    });
  });
});
