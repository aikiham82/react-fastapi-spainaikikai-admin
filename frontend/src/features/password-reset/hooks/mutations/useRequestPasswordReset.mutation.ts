import { useMutation } from "@tanstack/react-query";
import { passwordResetService } from "../../data/password-reset.service";
import type { PasswordResetRequest } from "../../data/password-reset.schema";

export const useRequestPasswordResetMutation = () => {
  const mutation = useMutation({
    mutationFn: async (data: PasswordResetRequest) => {
      return await passwordResetService.requestPasswordReset(data);
    },
  });

  return {
    requestReset: mutation.mutate,
    requestResetAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
};
