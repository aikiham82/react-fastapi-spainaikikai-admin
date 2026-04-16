import { z } from "zod/v4";

export const AuthResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
});

export const UserMeSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  global_role: z.string(),
  club_role: z.string().nullable().optional(),
  club_id: z.string().nullable().optional(),
  member_id: z.string().nullable().optional(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type UserMe = z.infer<typeof UserMeSchema>;
