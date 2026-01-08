import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importExportService } from '../../data/services/import-export.service';
import { toast } from 'sonner';

export const useImportMembersMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importExportService.importMembers,
    onSuccess: (response) => {
      toast.success(`${response.imported} miembros importados exitosamente`);
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
    },
    onError: (error: any) => {
      toast.error('Error al importar miembros');
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((err: string) => {
          toast.error(err);
        });
      }
    },
  });
};

export const useExportMembersMutation = () => {
  return useMutation({
    mutationFn: (filters?: any) => importExportService.exportMembers(filters),
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `members_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Datos exportados exitosamente');
    },
    onError: () => {
      toast.error('Error al exportar los datos');
    },
  });
};
