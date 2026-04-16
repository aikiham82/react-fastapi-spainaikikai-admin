import { useMutation } from "@tanstack/react-query";
import { login, getCurrentUser } from "../../auth.service";
import { useAuth } from "../useAuth";

interface LoginInput {
  email: string;
  password: string;
}

export function useLoginMutation() {
  const { signIn } = useAuth();

  return useMutation({
    mutationFn: async ({ email, password }: LoginInput) => {
      const authResponse = await login(email, password);
      const user = await getCurrentUser();
      return { token: authResponse.access_token, user };
    },
    onSuccess: ({ token, user }) => {
      signIn(token, user);
    },
  });
}
