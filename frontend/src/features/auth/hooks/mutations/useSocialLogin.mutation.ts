import { useMutation } from "@tanstack/react-query";
import { authService } from "../../data/auth.service";

export const useSocialLoginMutation = () => {
  const mutation = useMutation({
    mutationFn: (token: string) => authService.socialLogin(token),
  });

  return {
    action: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};
