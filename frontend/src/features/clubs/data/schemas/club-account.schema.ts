import { z } from 'zod';

export const clubAccountSchema = z.object({
  club_id: z.string(),
  club_name: z.string(),
  username: z.string(),
  email: z.string(),
  candidates: z.array(
    z.object({
      member_id: z.string(),
      name: z.string(),
      instructor_category: z.string(),
    })
  ),
});

export type ClubAccount = z.infer<typeof clubAccountSchema>;
