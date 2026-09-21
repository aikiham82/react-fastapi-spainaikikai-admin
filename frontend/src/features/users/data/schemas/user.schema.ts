import { z } from 'zod';

export const userAccountSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  is_active: z.boolean(),
  global_role: z.string(),
  member_id: z.string().nullable().optional(),
});

export const passwordResetLinkSchema = z.object({
  url: z.string(),
  email: z.string(),
  expires_at: z.string(),
});

export type UserAccount = z.infer<typeof userAccountSchema>;
export type PasswordResetLink = z.infer<typeof passwordResetLinkSchema>;
