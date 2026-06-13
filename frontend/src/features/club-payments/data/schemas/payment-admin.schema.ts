import { z } from 'zod';

// ─── Payment Method ────────────────────────────────────────────────
export const paymentMethodSchema = z.enum(['redsys', 'cash', 'transfer', 'other']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  redsys: 'Redsys (online)',
  cash: 'Efectivo',
  transfer: 'Transferencia',
  other: 'Otro',
};

// ─── Payment (transaction header) ─────────────────────────────────
export const paymentSchema = z.object({
  id: z.string(),
  club_id: z.string(),
  payment_type: z.string(),
  payment_method: paymentMethodSchema.default('redsys'),
  status: z.string(),
  amount: z.number(),
  payment_year: z.number(),
  payer_name: z.string(),
  payment_date: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

// ─── Register Manual Payment ───────────────────────────────────────
// Matches backend ManualPaymentRequest DTO
const memberAssignmentSchema = z.object({
  member_id: z.string().min(1),
  member_name: z.string().min(1),
  payment_types: z.array(z.string()).min(1),
});

export const manualPaymentSchema = z.object({
  payer_name: z.string().min(1, 'El nombre del pagador es obligatorio'),
  club_id: z.string().min(1, 'El club es obligatorio'),
  payment_year: z
    .number()
    .int()
    .min(1900, 'Año inválido')
    .max(2100, 'Año inválido'),
  payment_method: paymentMethodSchema,
  member_assignments: z
    .array(memberAssignmentSchema)
    .min(1, 'Debe asignar al menos un miembro'),
  include_club_fee: z.boolean(),
});
export type ManualPaymentFormData = z.infer<typeof manualPaymentSchema>;

// ─── Update Payment ────────────────────────────────────────────────
export const paymentUpdateSchema = z.object({
  amount: z.number().min(0, 'El importe no puede ser negativo').optional(),
  payment_year: z.number().int().min(1900).max(2100).optional(),
  payment_method: paymentMethodSchema.optional(),
  payer_name: z.string().min(1).optional(),
  status: z.string().optional(),
});
export type PaymentUpdateFormData = z.infer<typeof paymentUpdateSchema>;

// ─── Update MemberPayment (line) ───────────────────────────────────
export const memberPaymentUpdateSchema = z.object({
  payment_type: z.string().optional(),
  concept: z.string().optional(),
  amount: z.number().min(0, 'El importe no puede ser negativo').optional(),
  status: z.string().optional(),
});
export type MemberPaymentUpdateFormData = z.infer<typeof memberPaymentUpdateSchema>;

// ─── Club Member Payments list (GET /api/v1/member-payments/club/{club_id}) ─
// Reuses MemberPayment from member-payment.schema.ts.
// Import type MemberPayment from '@/features/member-payments/data/schemas/member-payment.schema'
// when used in the query hook.
