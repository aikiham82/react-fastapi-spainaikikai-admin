import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { paymentAdminService } from '../../data/services/payment-admin.service';
import { clubPaymentsKeys } from '../queries/useClubPaymentsQueries';

// ─── Register Manual Payment ───────────────────────────────────────────────
export const useRegisterManualPaymentMutation = (clubId: string, year: number) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: paymentAdminService.registerManualPayment,
    onSuccess: () => {
      toast.success('Pago registrado correctamente');
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubDetail(clubId, year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.allClubsSummary(year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubMemberPayments(clubId, year) });
    },
    onError: (error: { detail?: string; message?: string }) => {
      toast.error(error.detail || 'Error al registrar el pago');
    },
  });

  return {
    registerManualPayment: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};

// ─── Update Payment ────────────────────────────────────────────────────────
export const useUpdatePaymentMutation = (clubId: string, year: number) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof paymentAdminService.updatePayment>[1] }) =>
      paymentAdminService.updatePayment(id, data),
    onSuccess: () => {
      toast.success('Pago actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubDetail(clubId, year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.allClubsSummary(year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubMemberPayments(clubId, year) });
    },
    onError: (error: { detail?: string; message?: string }) => {
      toast.error(error.detail || 'Error al actualizar el pago');
    },
  });

  return {
    updatePayment: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};

// ─── Delete Payment ────────────────────────────────────────────────────────
export const useDeletePaymentMutation = (clubId: string, year: number) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      paymentAdminService.deletePayment(id, force),
    onSuccess: () => {
      toast.success('Pago eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubDetail(clubId, year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.allClubsSummary(year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubMemberPayments(clubId, year) });
    },
    onError: (error: { detail?: string; message?: string }) => {
      toast.error(error.detail || 'Error al eliminar el pago');
    },
  });

  return {
    deletePayment: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};

// ─── Update MemberPayment line ─────────────────────────────────────────────
export const useUpdateMemberPaymentMutation = (clubId: string, year: number) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof paymentAdminService.updateMemberPayment>[1] }) =>
      paymentAdminService.updateMemberPayment(id, data),
    onSuccess: () => {
      toast.success('Línea de pago actualizada correctamente');
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubDetail(clubId, year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.allClubsSummary(year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubMemberPayments(clubId, year) });
    },
    onError: (error: { detail?: string; message?: string }) => {
      toast.error(error.detail || 'Error al actualizar la línea de pago');
    },
  });

  return {
    updateMemberPayment: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};

// ─── Delete MemberPayment line ─────────────────────────────────────────────
export const useDeleteMemberPaymentMutation = (clubId: string, year: number) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => paymentAdminService.deleteMemberPayment(id),
    onSuccess: () => {
      toast.success('Línea de pago eliminada correctamente');
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubDetail(clubId, year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.allClubsSummary(year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubMemberPayments(clubId, year) });
    },
    onError: (error: { detail?: string; message?: string }) => {
      toast.error(error.detail || 'Error al eliminar la línea de pago');
    },
  });

  return {
    deleteMemberPayment: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};
