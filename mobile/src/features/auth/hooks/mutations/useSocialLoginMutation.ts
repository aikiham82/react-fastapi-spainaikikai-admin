import { useMutation } from "@tanstack/react-query";
import { socialLogin, getCurrentUser } from "../../auth.service";
import { useAuth } from "../useAuth";

export function useSocialLoginMutation() {
  const { signIn } = useAuth();

  return useMutation({
    mutationFn: async (clerkToken: string) => {
      const { access_token: token } = await socialLogin(clerkToken);
      const user = await getCurrentUser(token);
      return { token, user };
    },
    onSuccess: ({ token, user }) => {
      signIn(token, user);
    },
  });
}
