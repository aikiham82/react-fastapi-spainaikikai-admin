import { useMutation } from "@tanstack/react-query";
import { login, socialLogin, getCurrentUser } from "../../auth.service";
import type { AuthResponse } from "../../auth.schema";
import { useAuth } from "../useAuth";

interface LoginInput {
  email: string;
  password: string;
}

function useSessionMutation<TInput>(authenticate: (input: TInput) => Promise<AuthResponse>) {
  const { signIn } = useAuth();

  return useMutation({
    mutationFn: async (input: TInput) => {
      const { access_token: token } = await authenticate(input);
      const user = await getCurrentUser(token);
      return { token, user };
    },
    onSuccess: ({ token, user }) => {
      signIn(token, user);
    },
  });
}

export function useLoginMutation() {
  return useSessionMutation(({ email, password }: LoginInput) => login(email, password));
}

export function useSocialLoginMutation() {
  return useSessionMutation(socialLogin);
}
