import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invoiceService } from '../../data/services/invoice.service';
import { INVOICES_QUERY_KEY } from '../queries/useInvoiceQueries';

export const useDownloadInvoicePdfMutation = () => {
  return useMutation({
    mutationFn: ({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string }) =>
      invoiceService.downloadAndSavePdf(invoiceId, invoiceNumber),
    onSuccess: () => {
      toast.success('Factura descargada correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al descargar factura: ${error.message}`);
    },
  });
};

export const useRegenerateInvoicePdfMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) => invoiceService.regenerateInvoicePdf(invoiceId),
    onSuccess: () => {
      toast.success('PDF regenerado correctamente');
      queryClient.invalidateQueries({ queryKey: [INVOICES_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(`Error al regenerar PDF: ${error.message}`);
    },
  });
};
