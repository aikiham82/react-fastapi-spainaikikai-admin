import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';

// ─── Mock sonner BEFORE importing hooks ─────────────────────────────
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Mock payment-admin service BEFORE importing hooks ──────────────
vi.mock('@/features/club-payments/data/services/payment-admin.service', () => ({
  paymentAdminService: {
    registerManualPayment: vi.fn(),
    updatePayment: vi.fn(),
    deletePayment: vi.fn(),
    getClubMemberPayments: vi.fn(),
    updateMemberPayment: vi.fn(),
    deleteMemberPayment: vi.fn(),
  },
}));

// ─── Imports AFTER mocks ─────────────────────────────────────────────
import { toast } from 'sonner';
import { paymentAdminService } from '@/features/club-payments/data/services/payment-admin.service';
import {
  useRegisterManualPaymentMutation,
  useUpdatePaymentMutation,
  useDeletePaymentMutation,
  useUpdateMemberPaymentMutation,
  useDeleteMemberPaymentMutation,
} from '../../mutations/usePaymentAdminMutations';

// ─── Typed mock helpers ──────────────────────────────────────────────
const mockService = paymentAdminService as {
  registerManualPayment: ReturnType<typeof vi.fn>;
  updatePayment: ReturnType<typeof vi.fn>;
  deletePayment: ReturnType<typeof vi.fn>;
  getClubMemberPayments: ReturnType<typeof vi.fn>;
  updateMemberPayment: ReturnType<typeof vi.fn>;
  deleteMemberPayment: ReturnType<typeof vi.fn>;
};

const mockToast = toast as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

// ─── Test constants ──────────────────────────────────────────────────
const CLUB_ID = 'club-abc';
const YEAR = 2026;

// Expected invalidation keys
const CLUB_DETAIL_KEY = ['club-payments', 'club-detail', CLUB_ID, YEAR];
const ALL_CLUBS_SUMMARY_KEY = ['club-payments', 'all-clubs-summary', YEAR];
const CLUB_MEMBER_PAYMENTS_KEY = ['club-payments', 'club-member-payments', CLUB_ID, YEAR];

// ─── Mock data ───────────────────────────────────────────────────────
const mockPayment = {
  id: 'pay-001',
  club_id: CLUB_ID,
  payment_type: 'annual',
  payment_method: 'cash',
  status: 'completed',
  amount: 150.0,
  payment_year: YEAR,
  payer_name: 'Juan García',
};

const mockMemberPayment = {
  id: 'mp-001',
  payment_id: 'pay-001',
  member_id: 'mem-001',
  club_id: CLUB_ID,
  payment_year: YEAR,
  payment_type: 'licencia_kyu',
  concept: 'Licencia KYU 2026',
  amount: 75.0,
  status: 'completed',
};

// ─── QueryClient wrapper factory ─────────────────────────────────────
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper, queryClient };
}

// ─── Shared error objects (plain objects, NOT Error instances) ────────
const apiErrorWithDetail = { detail: 'Error específico del servidor', status: 422 };
const apiErrorWithoutDetail = { message: 'Network error', status: 500 };

// ─── useRegisterManualPaymentMutation ────────────────────────────────
describe('useRegisterManualPaymentMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Return shape', () => {
    it('returns { registerManualPayment, isLoading, error, isSuccess }', () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useRegisterManualPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      expect(result.current).toMatchObject({
        registerManualPayment: expect.any(Function),
        isLoading: expect.any(Boolean),
        error: null,
        isSuccess: expect.any(Boolean),
      });
    });

    it('initializes with isLoading=false, error=null, isSuccess=false', () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useRegisterManualPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.isSuccess).toBe(false);
    });
  });

  describe('Success path', () => {
    it('calls registerManualPayment service with the provided data', async () => {
      const { wrapper } = createWrapper();
      mockService.registerManualPayment.mockResolvedValue(mockPayment);

      const { result } = renderHook(
        () => useRegisterManualPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      const payload = {
        payer_name: 'Juan García',
        club_id: CLUB_ID,
        payment_year: YEAR,
        payment_method: 'cash',
        member_assignments: [{ member_id: 'mem-1', member_name: 'Ana', payment_types: ['licencia_kyu'] }],
        include_club_fee: false,
      };

      act(() => {
        result.current.registerManualPayment(payload);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockService.registerManualPayment).toHaveBeenCalledWith(payload);
      expect(mockService.registerManualPayment).toHaveBeenCalledTimes(1);
    });

    it('calls toast.success on success', async () => {
      const { wrapper } = createWrapper();
      mockService.registerManualPayment.mockResolvedValue(mockPayment);

      const { result } = renderHook(
        () => useRegisterManualPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.registerManualPayment({
          payer_name: 'Juan',
          club_id: CLUB_ID,
          payment_year: YEAR,
          payment_method: 'cash',
          member_assignments: [{ member_id: 'm1', member_name: 'Ana', payment_types: ['lic'] }],
          include_club_fee: false,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockToast.success).toHaveBeenCalledTimes(1);
    });

    it('invalidates clubDetail and allClubsSummary keys on success', async () => {
      const { wrapper, queryClient } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      mockService.registerManualPayment.mockResolvedValue(mockPayment);

      const { result } = renderHook(
        () => useRegisterManualPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.registerManualPayment({
          payer_name: 'Juan',
          club_id: CLUB_ID,
          payment_year: YEAR,
          payment_method: 'cash',
          member_assignments: [{ member_id: 'm1', member_name: 'Ana', payment_types: ['lic'] }],
          include_club_fee: false,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: CLUB_DETAIL_KEY });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ALL_CLUBS_SUMMARY_KEY });
    });
  });

  describe('Error path', () => {
    it('calls toast.error with detail message when error has detail', async () => {
      const { wrapper } = createWrapper();
      mockService.registerManualPayment.mockRejectedValue(apiErrorWithDetail);

      const { result } = renderHook(
        () => useRegisterManualPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.registerManualPayment({
          payer_name: 'Juan',
          club_id: CLUB_ID,
          payment_year: YEAR,
          payment_method: 'cash',
          member_assignments: [{ member_id: 'm1', member_name: 'Ana', payment_types: ['lic'] }],
          include_club_fee: false,
        });
      });

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(mockToast.error).toHaveBeenCalledWith(apiErrorWithDetail.detail);
    });

    it('calls toast.error with fallback message when error has no detail', async () => {
      const { wrapper } = createWrapper();
      mockService.registerManualPayment.mockRejectedValue(apiErrorWithoutDetail);

      const { result } = renderHook(
        () => useRegisterManualPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.registerManualPayment({
          payer_name: 'Juan',
          club_id: CLUB_ID,
          payment_year: YEAR,
          payment_method: 'cash',
          member_assignments: [],
          include_club_fee: false,
        });
      });

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(mockToast.error).toHaveBeenCalledWith('Error al registrar el pago');
    });
  });
});

// ─── useUpdatePaymentMutation ─────────────────────────────────────────
describe('useUpdatePaymentMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Return shape', () => {
    it('returns { updatePayment, isLoading, error, isSuccess }', () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useUpdatePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      expect(result.current).toMatchObject({
        updatePayment: expect.any(Function),
        isLoading: expect.any(Boolean),
        error: null,
        isSuccess: expect.any(Boolean),
      });
    });
  });

  describe('Success path', () => {
    it('calls updatePayment service with { id, data }', async () => {
      const { wrapper } = createWrapper();
      mockService.updatePayment.mockResolvedValue(mockPayment);

      const { result } = renderHook(
        () => useUpdatePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      const updateArg = { id: 'pay-001', data: { amount: 200, status: 'completed' } };

      act(() => {
        result.current.updatePayment(updateArg);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockService.updatePayment).toHaveBeenCalledWith('pay-001', { amount: 200, status: 'completed' });
    });

    it('calls toast.success on success', async () => {
      const { wrapper } = createWrapper();
      mockService.updatePayment.mockResolvedValue(mockPayment);

      const { result } = renderHook(
        () => useUpdatePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.updatePayment({ id: 'pay-001', data: { amount: 200 } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockToast.success).toHaveBeenCalledTimes(1);
    });

    it('invalidates clubDetail and allClubsSummary keys on success', async () => {
      const { wrapper, queryClient } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      mockService.updatePayment.mockResolvedValue(mockPayment);

      const { result } = renderHook(
        () => useUpdatePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.updatePayment({ id: 'pay-001', data: { amount: 200 } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: CLUB_DETAIL_KEY });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ALL_CLUBS_SUMMARY_KEY });
    });
  });

  describe('Error path', () => {
    it('calls toast.error with detail when available', async () => {
      const { wrapper } = createWrapper();
      mockService.updatePayment.mockRejectedValue(apiErrorWithDetail);

      const { result } = renderHook(
        () => useUpdatePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.updatePayment({ id: 'pay-001', data: { amount: 999 } });
      });

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(mockToast.error).toHaveBeenCalledWith(apiErrorWithDetail.detail);
    });

    it('calls toast.error with fallback when no detail', async () => {
      const { wrapper } = createWrapper();
      mockService.updatePayment.mockRejectedValue(apiErrorWithoutDetail);

      const { result } = renderHook(
        () => useUpdatePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.updatePayment({ id: 'pay-001', data: {} });
      });

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(mockToast.error).toHaveBeenCalledWith('Error al actualizar el pago');
    });
  });
});

// ─── useDeletePaymentMutation ─────────────────────────────────────────
describe('useDeletePaymentMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Return shape', () => {
    it('returns { deletePayment, isLoading, error, isSuccess }', () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useDeletePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      expect(result.current).toMatchObject({
        deletePayment: expect.any(Function),
        isLoading: expect.any(Boolean),
        error: null,
        isSuccess: expect.any(Boolean),
      });
    });
  });

  describe('Success path', () => {
    it('calls deletePayment service with id and force=true when force is true', async () => {
      const { wrapper } = createWrapper();
      mockService.deletePayment.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useDeletePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.deletePayment({ id: 'pay-001', force: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockService.deletePayment).toHaveBeenCalledWith('pay-001', true);
    });

    it('calls deletePayment service with id and force=undefined when force not provided', async () => {
      const { wrapper } = createWrapper();
      mockService.deletePayment.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useDeletePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.deletePayment({ id: 'pay-001' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // force is undefined when not provided; service defaults it to false
      expect(mockService.deletePayment).toHaveBeenCalledWith('pay-001', undefined);
    });

    it('calls toast.success on success', async () => {
      const { wrapper } = createWrapper();
      mockService.deletePayment.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useDeletePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.deletePayment({ id: 'pay-001', force: false });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockToast.success).toHaveBeenCalledTimes(1);
    });

    it('invalidates clubDetail and allClubsSummary keys on success', async () => {
      const { wrapper, queryClient } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      mockService.deletePayment.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useDeletePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.deletePayment({ id: 'pay-001' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: CLUB_DETAIL_KEY });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ALL_CLUBS_SUMMARY_KEY });
    });
  });

  describe('Error path', () => {
    it('calls toast.error with detail when available', async () => {
      const { wrapper } = createWrapper();
      mockService.deletePayment.mockRejectedValue(apiErrorWithDetail);

      const { result } = renderHook(
        () => useDeletePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.deletePayment({ id: 'pay-001' });
      });

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(mockToast.error).toHaveBeenCalledWith(apiErrorWithDetail.detail);
    });

    it('calls toast.error with fallback when no detail', async () => {
      const { wrapper } = createWrapper();
      mockService.deletePayment.mockRejectedValue(apiErrorWithoutDetail);

      const { result } = renderHook(
        () => useDeletePaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.deletePayment({ id: 'pay-001' });
      });

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(mockToast.error).toHaveBeenCalledWith('Error al eliminar el pago');
    });
  });
});

// ─── useUpdateMemberPaymentMutation ──────────────────────────────────
describe('useUpdateMemberPaymentMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Return shape', () => {
    it('returns { updateMemberPayment, isLoading, error, isSuccess }', () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useUpdateMemberPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      expect(result.current).toMatchObject({
        updateMemberPayment: expect.any(Function),
        isLoading: expect.any(Boolean),
        error: null,
        isSuccess: expect.any(Boolean),
      });
    });
  });

  describe('Success path', () => {
    it('calls updateMemberPayment service with { id, data }', async () => {
      const { wrapper } = createWrapper();
      mockService.updateMemberPayment.mockResolvedValue(mockMemberPayment);

      const { result } = renderHook(
        () => useUpdateMemberPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      const updateArg = { id: 'mp-001', data: { amount: 80, status: 'pending' } };

      act(() => {
        result.current.updateMemberPayment(updateArg);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockService.updateMemberPayment).toHaveBeenCalledWith('mp-001', { amount: 80, status: 'pending' });
    });

    it('calls toast.success on success', async () => {
      const { wrapper } = createWrapper();
      mockService.updateMemberPayment.mockResolvedValue(mockMemberPayment);

      const { result } = renderHook(
        () => useUpdateMemberPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.updateMemberPayment({ id: 'mp-001', data: { amount: 80 } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockToast.success).toHaveBeenCalledTimes(1);
    });

    it('invalidates clubDetail, allClubsSummary, and clubMemberPayments keys on success', async () => {
      const { wrapper, queryClient } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      mockService.updateMemberPayment.mockResolvedValue(mockMemberPayment);

      const { result } = renderHook(
        () => useUpdateMemberPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.updateMemberPayment({ id: 'mp-001', data: { amount: 80 } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: CLUB_DETAIL_KEY });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ALL_CLUBS_SUMMARY_KEY });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: CLUB_MEMBER_PAYMENTS_KEY });
    });
  });

  describe('Error path', () => {
    it('calls toast.error with detail when available', async () => {
      const { wrapper } = createWrapper();
      mockService.updateMemberPayment.mockRejectedValue(apiErrorWithDetail);

      const { result } = renderHook(
        () => useUpdateMemberPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.updateMemberPayment({ id: 'mp-001', data: { amount: 80 } });
      });

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(mockToast.error).toHaveBeenCalledWith(apiErrorWithDetail.detail);
    });

    it('calls toast.error with fallback when no detail', async () => {
      const { wrapper } = createWrapper();
      mockService.updateMemberPayment.mockRejectedValue(apiErrorWithoutDetail);

      const { result } = renderHook(
        () => useUpdateMemberPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.updateMemberPayment({ id: 'mp-001', data: {} });
      });

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(mockToast.error).toHaveBeenCalledWith('Error al actualizar la línea de pago');
    });
  });
});

// ─── useDeleteMemberPaymentMutation ──────────────────────────────────
describe('useDeleteMemberPaymentMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Return shape', () => {
    it('returns { deleteMemberPayment, isLoading, error, isSuccess }', () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => useDeleteMemberPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      expect(result.current).toMatchObject({
        deleteMemberPayment: expect.any(Function),
        isLoading: expect.any(Boolean),
        error: null,
        isSuccess: expect.any(Boolean),
      });
    });
  });

  describe('Success path', () => {
    it('calls deleteMemberPayment service with the payment line id', async () => {
      const { wrapper } = createWrapper();
      mockService.deleteMemberPayment.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useDeleteMemberPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.deleteMemberPayment('mp-001');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockService.deleteMemberPayment).toHaveBeenCalledWith('mp-001');
      expect(mockService.deleteMemberPayment).toHaveBeenCalledTimes(1);
    });

    it('calls toast.success on success', async () => {
      const { wrapper } = createWrapper();
      mockService.deleteMemberPayment.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useDeleteMemberPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.deleteMemberPayment('mp-001');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockToast.success).toHaveBeenCalledTimes(1);
    });

    it('invalidates clubDetail, allClubsSummary, and clubMemberPayments keys on success', async () => {
      const { wrapper, queryClient } = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      mockService.deleteMemberPayment.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useDeleteMemberPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.deleteMemberPayment('mp-001');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: CLUB_DETAIL_KEY });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ALL_CLUBS_SUMMARY_KEY });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: CLUB_MEMBER_PAYMENTS_KEY });
    });
  });

  describe('Error path', () => {
    it('calls toast.error with detail when available', async () => {
      const { wrapper } = createWrapper();
      mockService.deleteMemberPayment.mockRejectedValue(apiErrorWithDetail);

      const { result } = renderHook(
        () => useDeleteMemberPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.deleteMemberPayment('mp-001');
      });

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(mockToast.error).toHaveBeenCalledWith(apiErrorWithDetail.detail);
    });

    it('calls toast.error with fallback when no detail', async () => {
      const { wrapper } = createWrapper();
      mockService.deleteMemberPayment.mockRejectedValue(apiErrorWithoutDetail);

      const { result } = renderHook(
        () => useDeleteMemberPaymentMutation(CLUB_ID, YEAR),
        { wrapper }
      );

      act(() => {
        result.current.deleteMemberPayment('mp-001');
      });

      await waitFor(() => expect(result.current.error).toBeTruthy());

      expect(mockToast.error).toHaveBeenCalledWith('Error al eliminar la línea de pago');
    });
  });
});
