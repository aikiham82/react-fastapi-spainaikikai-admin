import { apiClient } from "@/core/api-client";
import { AuthResponseSchema, UserMeSchema } from "./auth.schema";
import type { AuthResponse, UserMe } from "./auth.schema";

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const params = new URLSearchParams();
  params.append("username", email);
  params.append("password", password);

  const { data } = await apiClient.post("/auth/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return AuthResponseSchema.parse(data);
}

export async function getCurrentUser(): Promise<UserMe> {
  const { data } = await apiClient.get("/users/me");
  return UserMeSchema.parse(data);
}
