import { z } from 'zod';

// Member Payment Types matching backend
export const MEMBER_PAYMENT_TYPES = {
  licencia_kyu: 'Licencia KYU',
  licencia_kyu_infantil: 'Licencia KYU Infantil',
  licencia_dan: 'Licencia DAN',
  titulo_fukushidoin: 'Título Fukushidoin',
  titulo_shidoin: 'Título Shidoin',
  seguro_accidentes: 'Seguro de accidentes',
  seguro_rc: 'Seguro RC',
  cuota_club: 'Cuota de Club',
  examen_dan_1_hombu: 'Examen 1.er Dan (con nº Hombu)',
  examen_dan_1: 'Examen 1.er Dan (sin nº Hombu)',
  examen_dan_2: 'Examen 2.º Dan',
  examen_dan_3: 'Examen 3.er Dan',
  examen_dan_4: 'Examen 4.º Dan',
  examen_dan_5: 'Examen 5.º Dan',
  examen_dan_6: 'Examen 6.º Dan',
} as const;

export type MemberPaymentType = keyof typeof MEMBER_PAYMENT_TYPES;

// Member Payment Status
export const MEMBER_PAYMENT_STATUS = {
  pending: 'Pendiente',
  completed: 'Completado',
  refunded: 'Reembolsado',
} as const;

export type MemberPaymentStatus = keyof typeof MEMBER_PAYMENT_STATUS;

// Schemas for API responses
export const memberPaymentSchema = z.object({
  id: z.string(),
  payment_id: z.string(),
  member_id: z.string(),
  member_name: z.string().nullable().optional(),
  club_id: z.string(),
  payment_year: z.number(),
  payment_type: z.string(),
  concept: z.string(),
  amount: z.number(),
  status: z.string(),
  paid_at: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  received_by_card: z.boolean().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type MemberPayment = z.infer<typeof memberPaymentSchema>;

export const paymentTypeStatusSchema = z.object({
  payment_type: z.string(),
  is_paid: z.boolean(),
  amount: z.number().nullable().optional(),
  payment_date: z.string().nullable().optional(),
});

export type PaymentTypeStatus = z.infer<typeof paymentTypeStatusSchema>;

export const memberPaymentStatusSchema = z.object({
  member_id: z.string(),
  member_name: z.string(),
  payment_year: z.number(),
  payment_statuses: z.array(paymentTypeStatusSchema),
  total_paid: z.number(),
  has_all_licenses: z.boolean(),
  has_all_insurances: z.boolean(),
});

export type MemberPaymentStatusResponse = z.infer<typeof memberPaymentStatusSchema>;

export const memberPaymentHistorySchema = z.object({
  member_id: z.string(),
  member_name: z.string(),
  payments: z.array(memberPaymentSchema),
  total_count: z.number(),
});

export type MemberPaymentHistoryResponse = z.infer<typeof memberPaymentHistorySchema>;

export const paymentTypeSummarySchema = z.object({
  payment_type: z.string(),
  paid_count: z.number(),
  total_amount: z.number(),
});

export type PaymentTypeSummary = z.infer<typeof paymentTypeSummarySchema>;

export const memberPaymentSummarySchema = z.object({
  member_id: z.string(),
  member_name: z.string(),
  license_paid: z.boolean(),
  insurance_paid: z.boolean(),
  total_paid: z.number(),
  grade_group: z.string().optional().default('unknown'),
});

export type MemberPaymentSummary = z.infer<typeof memberPaymentSummarySchema>;

export const clubPaymentSummarySchema = z.object({
  club_id: z.string(),
  club_name: z.string(),
  payment_year: z.number(),
  total_members: z.number(),
  members_with_license: z.number(),
  members_with_insurance: z.number(),
  total_collected: z.number(),
  has_club_fee: z.boolean(),
  by_payment_type: z.array(paymentTypeSummarySchema),
  members: z.array(memberPaymentSummarySchema),
});

export type ClubPaymentSummaryResponse = z.infer<typeof clubPaymentSummarySchema>;

export const unpaidMemberSchema = z.object({
  member_id: z.string(),
  member_name: z.string(),
  email: z.string(),
  dni: z.string(),
});

export type UnpaidMember = z.infer<typeof unpaidMemberSchema>;

export const unpaidMembersResponseSchema = z.object({
  club_id: z.string(),
  payment_year: z.number(),
  payment_type: z.string().nullable().optional(),
  unpaid_members: z.array(unpaidMemberSchema),
  total_count: z.number(),
});

export type UnpaidMembersResponse = z.infer<typeof unpaidMembersResponseSchema>;

// Member assignment for annual payments
export interface MemberPaymentAssignment {
  member_id: string;
  member_name: string;
  payment_types: string[];
}
