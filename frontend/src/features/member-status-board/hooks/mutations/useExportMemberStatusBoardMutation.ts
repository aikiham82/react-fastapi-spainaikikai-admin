import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { downloadBlob } from '@/core/utils/downloadBlob';
import { exportMemberStatusBoard } from '../../data/services/member-status.service';

export const useExportMemberStatusBoardMutation = () =>
  useMutation({
    mutationFn: (paymentYear: number) => exportMemberStatusBoard(paymentYear),
    onSuccess: (blob: Blob, paymentYear: number) =>
      downloadBlob(blob, `estado_socios_${paymentYear}_${new Date().toISOString().split('T')[0]}.xlsx`),
    onError: () => {
      toast.error('No se ha podido descargar el Excel');
    },
  });
