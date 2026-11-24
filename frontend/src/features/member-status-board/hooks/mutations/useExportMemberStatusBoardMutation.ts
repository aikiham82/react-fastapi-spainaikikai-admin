import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { exportMemberStatusBoard } from '../../data/services/member-status.service';

export const useExportMemberStatusBoardMutation = () =>
  useMutation({
    mutationFn: (paymentYear: number) => exportMemberStatusBoard(paymentYear),
    onSuccess: (blob: Blob, paymentYear: number) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `estado_socios_${paymentYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    },
    onError: () => {
      toast.error('No se ha podido descargar el Excel');
    },
  });
