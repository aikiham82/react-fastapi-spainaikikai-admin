import { describe, it, expect } from 'vitest';
import {
  manualPaymentSchema,
  paymentUpdateSchema,
  memberPaymentUpdateSchema,
} from '../schemas/payment-admin.schema';

// ─── Helpers ───────────────────────────────────────────────────────
const validManualPayment = {
  payer_name: 'Juan García',
  club_id: 'club-abc-123',
  payment_year: 2024,
  payment_method: 'cash' as const,
  member_assignments: [
    {
      member_id: 'member-1',
      member_name: 'Ana López',
      payment_types: ['licencia_kyu'],
    },
  ],
  include_club_fee: false,
};

// ─── manualPaymentSchema ───────────────────────────────────────────
describe('manualPaymentSchema', () => {
  it('valid data passes', () => {
    const result = manualPaymentSchema.safeParse(validManualPayment);
    expect(result.success).toBe(true);
  });

  it('empty payer_name fails with message', () => {
    const result = manualPaymentSchema.safeParse({
      ...validManualPayment,
      payer_name: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.toLowerCase().includes('pagador'))).toBe(true);
    }
  });

  it('empty member_assignments array fails', () => {
    const result = manualPaymentSchema.safeParse({
      ...validManualPayment,
      member_assignments: [],
    });
    expect(result.success).toBe(false);
  });

  it('payment_year < 1900 fails', () => {
    const result = manualPaymentSchema.safeParse({
      ...validManualPayment,
      payment_year: 1899,
    });
    expect(result.success).toBe(false);
  });

  it('invalid payment_method string fails', () => {
    const result = manualPaymentSchema.safeParse({
      ...validManualPayment,
      payment_method: 'credit_card',
    });
    expect(result.success).toBe(false);
  });

  it('"redsys" as payment_method passes (schema allows it; UI restricts)', () => {
    const result = manualPaymentSchema.safeParse({
      ...validManualPayment,
      payment_method: 'redsys',
    });
    expect(result.success).toBe(true);
  });
});

// ─── paymentUpdateSchema ───────────────────────────────────────────
describe('paymentUpdateSchema', () => {
  it('empty object passes (all optional)', () => {
    const result = paymentUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('negative amount fails', () => {
    const result = paymentUpdateSchema.safeParse({ amount: -1 });
    expect(result.success).toBe(false);
  });

  it('year out of range fails', () => {
    const tooLow = paymentUpdateSchema.safeParse({ payment_year: 1800 });
    expect(tooLow.success).toBe(false);

    const tooHigh = paymentUpdateSchema.safeParse({ payment_year: 2200 });
    expect(tooHigh.success).toBe(false);
  });

  it('invalid payment_method fails', () => {
    const result = paymentUpdateSchema.safeParse({ payment_method: 'bitcoin' });
    expect(result.success).toBe(false);
  });
});

// ─── memberPaymentUpdateSchema ─────────────────────────────────────
describe('memberPaymentUpdateSchema', () => {
  it('empty object passes', () => {
    const result = memberPaymentUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('negative amount fails', () => {
    const result = memberPaymentUpdateSchema.safeParse({ amount: -0.01 });
    expect(result.success).toBe(false);
  });
});
