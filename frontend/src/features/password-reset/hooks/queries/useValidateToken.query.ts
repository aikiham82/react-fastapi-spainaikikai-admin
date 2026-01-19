import { useQuery } from "@tanstack/react-query";
import { passwordResetService } from "../../data/password-reset.service";

export const useValidateTokenQuery = (token: string | null) => {
  const query = useQuery({
    queryKey: ["password-reset", "validate", token],
    queryFn: async () => {
      if (!token) {
        throw new Error("Token is required");
      }
      return await passwordResetService.validateToken(token);
    },
    enabled: !!token,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,
  };
};
