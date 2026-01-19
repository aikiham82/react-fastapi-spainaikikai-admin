import { useMutation } from "@tanstack/react-query";
import { passwordResetService } from "../../data/password-reset.service";
import type { ResetPasswordRequest } from "../../data/password-reset.schema";

export const useResetPasswordMutation = () => {
  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordRequest) => {
      return await passwordResetService.resetPassword(data);
    },
  });

  return {
    resetPassword: mutation.mutate,
    resetPasswordAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
};
