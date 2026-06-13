/**
 * Tests for useAllClubsPaymentSummaryQuery, useClubPaymentDetailQuery, and the
 * remaining clubPaymentsKeys shapes (.all, .allClubsSummary, .clubDetail).
 *
 * useClubMemberPaymentsQuery + clubPaymentsKeys.clubMemberPayments are already
 * covered in useClubMemberPaymentsQuery.test.ts — NOT duplicated here.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';

// Mock club-payments service BEFORE importing hooks
vi.mock(
  '@/features/club-payments/data/services/club-payments.service',
  () => ({
    clubPaymentsService: {
      getAllClubsPaymentSummary: vi.fn(),
      getClubPaymentSummary: vi.fn(),
    },
  })
);

import {
  useAllClubsPaymentSummaryQuery,
  useClubPaymentDetailQuery,
  clubPaymentsKeys,
} from '../../queries/useClubPaymentsQueries';
import { clubPaymentsService } from '@/features/club-payments/data/services/club-payments.service';

const mockService = clubPaymentsService as unknown as {
  getAllClubsPaymentSummary: ReturnType<typeof vi.fn>;
  getClubPaymentSummary: ReturnType<typeof vi.fn>;
};

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockAllClubsSummary = {
  payment_year: 2026,
  clubs: [
    {
      club_id: 'club-abc',
      club_name: 'Club Aikido Madrid',
      total_members: 30,
      members_with_license: 28,
      members_with_insurance: 25,
      total_collected: 2100,
      has_club_fee: true,
    },
  ],
  grand_total_collected: 2100,
  grand_total_members: 30,
};

const mockClubDetail = {
  club_id: 'club-abc',
  club_name: 'Club Aikido Madrid',
  payment_year: 2026,
  total_members: 30,
  members_with_license: 28,
  members_with_insurance: 25,
  total_collected: 2100,
  has_club_fee: true,
  by_payment_type: [],
  members: [],
};

// ─── Wrapper factory ──────────────────────────────────────────────────────────

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

// ─── clubPaymentsKeys (remaining shapes) ─────────────────────────────────────

describe('clubPaymentsKeys', () => {
  describe('.all', () => {
    it('returns the base tuple ["club-payments"]', () => {
      expect(clubPaymentsKeys.all).toEqual(['club-payments']);
    });
  });

  describe('.allClubsSummary', () => {
    it('returns the correct tuple with a year', () => {
      expect(clubPaymentsKeys.allClubsSummary(2026)).toEqual([
        'club-payments',
        'all-clubs-summary',
        2026,
      ]);
    });

    it('returns the correct tuple without a year (undefined)', () => {
      expect(clubPaymentsKeys.allClubsSummary()).toEqual([
        'club-payments',
        'all-clubs-summary',
        undefined,
      ]);
    });

    it('starts with the same root as clubPaymentsKeys.all', () => {
      expect(clubPaymentsKeys.allClubsSummary(2026)[0]).toBe(clubPaymentsKeys.all[0]);
    });
  });

  describe('.clubDetail', () => {
    it('returns the correct tuple with clubId and year', () => {
      expect(clubPaymentsKeys.clubDetail('club-abc', 2026)).toEqual([
        'club-payments',
        'club-detail',
        'club-abc',
        2026,
      ]);
    });

    it('returns the correct tuple with clubId only', () => {
      expect(clubPaymentsKeys.clubDetail('club-abc')).toEqual([
        'club-payments',
        'club-detail',
        'club-abc',
        undefined,
      ]);
    });

    it('starts with the same root as clubPaymentsKeys.all', () => {
      expect(clubPaymentsKeys.clubDetail('x', 2025)[0]).toBe(clubPaymentsKeys.all[0]);
    });
  });
});

// ─── useAllClubsPaymentSummaryQuery ──────────────────────────────────────────

describe('useAllClubsPaymentSummaryQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful fetch', () => {
    it('calls getAllClubsPaymentSummary with year and returns data', async () => {
      mockService.getAllClubsPaymentSummary.mockResolvedValue(mockAllClubsSummary);

      const { result } = renderHook(
        () => useAllClubsPaymentSummaryQuery(2026),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockService.getAllClubsPaymentSummary).toHaveBeenCalledTimes(1);
      expect(mockService.getAllClubsPaymentSummary).toHaveBeenCalledWith(2026);
      expect(result.current.data).toEqual(mockAllClubsSummary);
    });

    it('calls getAllClubsPaymentSummary without year when year is undefined', async () => {
      mockService.getAllClubsPaymentSummary.mockResolvedValue(mockAllClubsSummary);

      const { result } = renderHook(
        () => useAllClubsPaymentSummaryQuery(undefined),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockService.getAllClubsPaymentSummary).toHaveBeenCalledWith(undefined);
    });

    it('transitions from loading to success', async () => {
      mockService.getAllClubsPaymentSummary.mockResolvedValue(mockAllClubsSummary);

      const { result } = renderHook(
        () => useAllClubsPaymentSummaryQuery(2026),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Disabled query', () => {
    it('does NOT call service when enabled=false', async () => {
      const { result } = renderHook(
        () => useAllClubsPaymentSummaryQuery(2026, false),
        { wrapper: createWrapper() }
      );

      await new Promise((r) => setTimeout(r, 50));

      expect(mockService.getAllClubsPaymentSummary).not.toHaveBeenCalled();
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('Error handling', () => {
    it('transitions to error state when service rejects', async () => {
      const apiError = { message: 'Forbidden', detail: 'Not authorized', status: 403 };
      mockService.getAllClubsPaymentSummary.mockRejectedValue(apiError);

      const { result } = renderHook(
        () => useAllClubsPaymentSummaryQuery(2026),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(apiError);
      expect(result.current.data).toBeUndefined();
    });
  });
});

// ─── useClubPaymentDetailQuery ────────────────────────────────────────────────

describe('useClubPaymentDetailQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Successful fetch', () => {
    it('calls getClubPaymentSummary with clubId and year and returns data', async () => {
      mockService.getClubPaymentSummary.mockResolvedValue(mockClubDetail);

      const { result } = renderHook(
        () => useClubPaymentDetailQuery('club-abc', 2026),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockService.getClubPaymentSummary).toHaveBeenCalledTimes(1);
      expect(mockService.getClubPaymentSummary).toHaveBeenCalledWith('club-abc', 2026);
      expect(result.current.data).toEqual(mockClubDetail);
    });

    it('calls getClubPaymentSummary without year when year is undefined', async () => {
      mockService.getClubPaymentSummary.mockResolvedValue(mockClubDetail);

      const { result } = renderHook(
        () => useClubPaymentDetailQuery('club-abc', undefined),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockService.getClubPaymentSummary).toHaveBeenCalledWith('club-abc', undefined);
    });
  });

  describe('Disabled query — enabled gating', () => {
    it('does NOT call service when enabled=false', async () => {
      const { result } = renderHook(
        () => useClubPaymentDetailQuery('club-abc', 2026, false),
        { wrapper: createWrapper() }
      );

      await new Promise((r) => setTimeout(r, 50));

      expect(mockService.getClubPaymentSummary).not.toHaveBeenCalled();
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('does NOT call service when clubId is empty string (internal guard: enabled && !!clubId)', async () => {
      const { result } = renderHook(
        () => useClubPaymentDetailQuery('', 2026),
        { wrapper: createWrapper() }
      );

      await new Promise((r) => setTimeout(r, 50));

      expect(mockService.getClubPaymentSummary).not.toHaveBeenCalled();
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('calls service when clubId is non-empty and enabled=true', async () => {
      mockService.getClubPaymentSummary.mockResolvedValue(mockClubDetail);

      const { result } = renderHook(
        () => useClubPaymentDetailQuery('club-abc', 2026, true),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockService.getClubPaymentSummary).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('transitions to error state when service rejects', async () => {
      const apiError = { message: 'Not Found', detail: 'Club not found', status: 404 };
      mockService.getClubPaymentSummary.mockRejectedValue(apiError);

      const { result } = renderHook(
        () => useClubPaymentDetailQuery('club-abc', 2026),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(apiError);
    });
  });
});
