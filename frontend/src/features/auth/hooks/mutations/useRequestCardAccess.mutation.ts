import { useMutation } from "@tanstack/react-query";
import { authService } from "../../data/auth.service";

export const useRequestCardAccessMutation = () => {
  const mutation = useMutation({
    mutationFn: (email: string) => authService.requestCardAccess(email),
  });

  return {
    requestCardAccess: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    answer: mutation.data?.message,
  };
};
