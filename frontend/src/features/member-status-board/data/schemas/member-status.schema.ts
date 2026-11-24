import { z } from 'zod';

const licenseSummarySchema = z.object({
  grade: z.string().nullable(),
  technical_grade: z.string().nullable(),
  instructor_category: z.string().nullable(),
  status: z.string().nullable(),
  expiration_date: z.string().nullable(),
});

const insuranceSummarySchema = z.object({
  has_accident: z.boolean(),
  accident_status: z.string().nullish(),
  has_rc: z.boolean(),
  rc_status: z.string().nullish(),
});

export const memberStatusRowSchema = z.object({
  member_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  club_id: z.string().nullish(),
  club_name: z.string().nullish(),
  member_status: z.string(),
  license_summary: licenseSummarySchema.nullish(),
  insurance_summary: insuranceSummarySchema.nullish(),
  license_paid: z.boolean(),
  license_payment_id: z.string().nullish(),
  licence_item: z.string().nullish(),
  accident_insurance_id: z.string().nullish(),
  accident_insurance_annulled: z.boolean().optional(),
  rc_insurance_id: z.string().nullish(),
  rc_insurance_annulled: z.boolean().optional(),
  accident_season_paid: z.boolean().optional(),
  rc_season_paid: z.boolean().optional(),
});

export const memberStatusBoardSchema = z.array(memberStatusRowSchema);

export type MemberStatusRow = z.infer<typeof memberStatusRowSchema>;
