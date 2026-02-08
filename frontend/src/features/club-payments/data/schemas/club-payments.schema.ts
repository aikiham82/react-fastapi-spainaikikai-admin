import { z } from 'zod';

export const clubSummaryItemSchema = z.object({
  club_id: z.string(),
  club_name: z.string(),
  total_members: z.number(),
  members_with_license: z.number(),
  members_with_insurance: z.number(),
  total_collected: z.number(),
  has_club_fee: z.boolean(),
});

export type ClubSummaryItem = z.infer<typeof clubSummaryItemSchema>;

export const allClubsPaymentSummarySchema = z.object({
  payment_year: z.number(),
  clubs: z.array(clubSummaryItemSchema),
  grand_total_collected: z.number(),
  grand_total_members: z.number(),
});

export type AllClubsPaymentSummaryResponse = z.infer<typeof allClubsPaymentSummarySchema>;
