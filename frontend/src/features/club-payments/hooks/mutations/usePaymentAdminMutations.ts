import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { paymentAdminService } from '../../data/services/payment-admin.service';
import { clubPaymentsKeys } from '../queries/useClubPaymentsQueries';
import { memberPaymentKeys } from '@/features/member-payments/hooks/queries/useMemberPaymentQueries';

const invalidatePayments = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.all });
  queryClient.invalidateQueries({ queryKey: memberPaymentKeys.all });
};

// ─── Register Manual Payment ───────────────────────────────────────────────
export const useRegisterManualPaymentMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: paymentAdminService.registerManualPayment,
    onSuccess: () => {
      toast.success('Pago registrado correctamente');
      invalidatePayments(queryClient);
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
export const useUpdatePaymentMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof paymentAdminService.updatePayment>[1] }) =>
      paymentAdminService.updatePayment(id, data),
    onSuccess: () => {
      toast.success('Pago actualizado correctamente');
      invalidatePayments(queryClient);
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
export const useDeletePaymentMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      paymentAdminService.deletePayment(id, force),
    onSuccess: () => {
      toast.success('Pago eliminado correctamente');
      invalidatePayments(queryClient);
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
export const useUpdateMemberPaymentMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof paymentAdminService.updateMemberPayment>[1] }) =>
      paymentAdminService.updateMemberPayment(id, data),
    onSuccess: () => {
      toast.success('Línea de pago actualizada correctamente');
      invalidatePayments(queryClient);
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
export const useDeleteMemberPaymentMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => paymentAdminService.deleteMemberPayment(id),
    onSuccess: () => {
      toast.success('Línea de pago eliminada correctamente');
      invalidatePayments(queryClient);
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
