import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerManualPayment,
  updatePayment,
  deletePayment,
  getClubMemberPayments,
  updateMemberPayment,
  deleteMemberPayment,
  paymentAdminService,
} from '../services/payment-admin.service';
import { apiClient } from '@/core/data/apiClient';
import type { Payment } from '../schemas/payment-admin.schema';
import type { MemberPayment } from '@/features/member-payments/data/schemas/member-payment.schema';

// Mock the apiClient module
vi.mock('@/core/data/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

// ─── Mock data ─────────────────────────────────────────────────────
const mockPayment: Payment = {
  id: 'payment-123',
  club_id: 'club-abc',
  payment_type: 'licencias',
  payment_method: 'cash',
  status: 'completed',
  amount: 150.0,
  payment_year: 2026,
  payer_name: 'Juan García',
  payment_date: '2026-06-01',
  created_at: '2026-06-01T10:00:00',
  updated_at: '2026-06-01T10:00:00',
};

const mockMemberPayment: MemberPayment = {
  id: 'mp-456',
  payment_id: 'payment-123',
  member_id: 'member-001',
  club_id: 'club-abc',
  payment_year: 2026,
  payment_type: 'licencia_kyu',
  concept: 'Licencia KYU 2026',
  amount: 75.0,
  status: 'completed',
  created_at: '2026-06-01T10:00:00',
  updated_at: '2026-06-01T10:00:00',
};

const mockManualPaymentData = {
  payer_name: 'Juan García',
  club_id: 'club-abc',
  payment_year: 2026,
  payment_method: 'cash',
  member_assignments: [
    {
      member_id: 'member-001',
      member_name: 'Ana López',
      payment_types: ['licencia_kyu'],
    },
  ],
  include_club_fee: false,
};

// ─── Tests ─────────────────────────────────────────────────────────
describe('paymentAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── registerManualPayment ───────────────────────────────────────
  describe('registerManualPayment', () => {
    it('calls POST /api/v1/payments/manual with the correct body', async () => {
      mockApiClient.post.mockResolvedValue(mockPayment);

      const result = await registerManualPayment(mockManualPaymentData);

      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/payments/manual',
        mockManualPaymentData
      );
      expect(result).toEqual(mockPayment);
    });

    it('propagates errors thrown by apiClient', async () => {
      const apiError = { message: 'Forbidden', detail: 'Not authorized', status: 403 };
      mockApiClient.post.mockRejectedValue(apiError);

      await expect(registerManualPayment(mockManualPaymentData)).rejects.toEqual(apiError);
    });
  });

  // ─── updatePayment ───────────────────────────────────────────────
  describe('updatePayment', () => {
    const updateData = { payer_name: 'María López', amount: 200 };

    it('calls PUT /api/v1/payments/{id} with the correct body', async () => {
      mockApiClient.put.mockResolvedValue({ ...mockPayment, ...updateData });

      const result = await updatePayment('payment-123', updateData);

      expect(mockApiClient.put).toHaveBeenCalledTimes(1);
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/v1/payments/payment-123',
        updateData
      );
      expect(result.payer_name).toBe('María López');
    });

    it('uses the correct payment id in the URL', async () => {
      mockApiClient.put.mockResolvedValue(mockPayment);

      await updatePayment('payment-xyz-999', {});

      const [url] = mockApiClient.put.mock.calls[0];
      expect(url).toBe('/api/v1/payments/payment-xyz-999');
    });

    it('propagates errors from apiClient', async () => {
      const apiError = { message: 'Not Found', detail: 'Payment not found', status: 404 };
      mockApiClient.put.mockRejectedValue(apiError);

      await expect(updatePayment('payment-123', updateData)).rejects.toEqual(apiError);
    });
  });

  // ─── deletePayment ───────────────────────────────────────────────
  describe('deletePayment', () => {
    it('calls DELETE /api/v1/payments/{id} without force param when force defaults to false', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await deletePayment('payment-123');

      expect(mockApiClient.delete).toHaveBeenCalledTimes(1);
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/api/v1/payments/payment-123',
        { params: undefined }
      );
    });

    it('calls DELETE /api/v1/payments/{id} with params: { force: true } when force=true', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await deletePayment('payment-123', true);

      expect(mockApiClient.delete).toHaveBeenCalledTimes(1);
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/api/v1/payments/payment-123',
        { params: { force: true } }
      );
    });

    it('calls DELETE /api/v1/payments/{id} without force param when force=false', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await deletePayment('payment-123', false);

      expect(mockApiClient.delete).toHaveBeenCalledTimes(1);
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/api/v1/payments/payment-123',
        { params: undefined }
      );
    });

    it('propagates errors from apiClient', async () => {
      const apiError = { message: 'Conflict', detail: 'Cannot delete completed payment', status: 409 };
      mockApiClient.delete.mockRejectedValue(apiError);

      await expect(deletePayment('payment-123')).rejects.toEqual(apiError);
    });
  });

  // ─── getClubMemberPayments ───────────────────────────────────────
  describe('getClubMemberPayments', () => {
    it('calls GET /api/v1/member-payments/club/{clubId} without params when no year given', async () => {
      mockApiClient.get.mockResolvedValue([mockMemberPayment]);

      const result = await getClubMemberPayments('club-abc');

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/member-payments/club/club-abc',
        { params: undefined }
      );
      expect(result).toEqual([mockMemberPayment]);
    });

    it('calls GET /api/v1/member-payments/club/{clubId} with payment_year param when year provided', async () => {
      mockApiClient.get.mockResolvedValue([mockMemberPayment]);

      await getClubMemberPayments('club-abc', 2026);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/member-payments/club/club-abc',
        { params: { payment_year: 2026 } }
      );
    });

    it('uses the correct club id in the URL', async () => {
      mockApiClient.get.mockResolvedValue([]);

      await getClubMemberPayments('club-xyz-special', 2025);

      const [url, config] = mockApiClient.get.mock.calls[0];
      expect(url).toBe('/api/v1/member-payments/club/club-xyz-special');
      expect(config.params.payment_year).toBe(2025);
    });

    it('returns an array of MemberPayment objects', async () => {
      const payments = [mockMemberPayment, { ...mockMemberPayment, id: 'mp-789' }];
      mockApiClient.get.mockResolvedValue(payments);

      const result = await getClubMemberPayments('club-abc', 2026);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('propagates errors from apiClient', async () => {
      const apiError = { message: 'Forbidden', detail: 'Not authorized', status: 403 };
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(getClubMemberPayments('club-abc', 2026)).rejects.toEqual(apiError);
    });
  });

  // ─── updateMemberPayment ─────────────────────────────────────────
  describe('updateMemberPayment', () => {
    const updateData = { status: 'completed', amount: 80 };

    it('calls PUT /api/v1/member-payments/{id} with the correct body', async () => {
      mockApiClient.put.mockResolvedValue({ ...mockMemberPayment, ...updateData });

      const result = await updateMemberPayment('mp-456', updateData);

      expect(mockApiClient.put).toHaveBeenCalledTimes(1);
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/v1/member-payments/mp-456',
        updateData
      );
      expect(result.status).toBe('completed');
    });

    it('uses the correct member payment id in the URL', async () => {
      mockApiClient.put.mockResolvedValue(mockMemberPayment);

      await updateMemberPayment('mp-abc-999', {});

      const [url] = mockApiClient.put.mock.calls[0];
      expect(url).toBe('/api/v1/member-payments/mp-abc-999');
    });

    it('propagates errors from apiClient', async () => {
      const apiError = { message: 'Not Found', detail: 'MemberPayment not found', status: 404 };
      mockApiClient.put.mockRejectedValue(apiError);

      await expect(updateMemberPayment('mp-456', updateData)).rejects.toEqual(apiError);
    });
  });

  // ─── deleteMemberPayment ─────────────────────────────────────────
  describe('deleteMemberPayment', () => {
    it('calls DELETE /api/v1/member-payments/{id}', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await deleteMemberPayment('mp-456');

      expect(mockApiClient.delete).toHaveBeenCalledTimes(1);
      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/member-payments/mp-456');
    });

    it('uses the correct member payment id in the URL', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await deleteMemberPayment('mp-special-99');

      const [url] = mockApiClient.delete.mock.calls[0];
      expect(url).toBe('/api/v1/member-payments/mp-special-99');
    });

    it('propagates errors from apiClient', async () => {
      const apiError = { message: 'Not Found', detail: 'MemberPayment not found', status: 404 };
      mockApiClient.delete.mockRejectedValue(apiError);

      await expect(deleteMemberPayment('mp-456')).rejects.toEqual(apiError);
    });
  });

  // ─── paymentAdminService object ──────────────────────────────────
  describe('paymentAdminService (named export object)', () => {
    it('exposes all expected service methods', () => {
      expect(typeof paymentAdminService.registerManualPayment).toBe('function');
      expect(typeof paymentAdminService.updatePayment).toBe('function');
      expect(typeof paymentAdminService.deletePayment).toBe('function');
      expect(typeof paymentAdminService.getClubMemberPayments).toBe('function');
      expect(typeof paymentAdminService.updateMemberPayment).toBe('function');
      expect(typeof paymentAdminService.deleteMemberPayment).toBe('function');
    });

    it('service object methods are the same references as the named exports', () => {
      expect(paymentAdminService.registerManualPayment).toBe(registerManualPayment);
      expect(paymentAdminService.updatePayment).toBe(updatePayment);
      expect(paymentAdminService.deletePayment).toBe(deletePayment);
      expect(paymentAdminService.getClubMemberPayments).toBe(getClubMemberPayments);
      expect(paymentAdminService.updateMemberPayment).toBe(updateMemberPayment);
      expect(paymentAdminService.deleteMemberPayment).toBe(deleteMemberPayment);
    });

    it('registerManualPayment via service object calls the correct endpoint', async () => {
      mockApiClient.post.mockResolvedValue(mockPayment);

      await paymentAdminService.registerManualPayment(mockManualPaymentData);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/v1/payments/manual',
        mockManualPaymentData
      );
    });
  });
});
