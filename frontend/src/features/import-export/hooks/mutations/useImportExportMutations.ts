import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importExportService } from '../../data/services/import-export.service';
import { toast } from 'sonner';

export const useImportMembersMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importExportService.importMembers,
    onSuccess: (response) => {
      const parts = [];
      if (response.imported > 0) parts.push(`${response.imported} creados`);
      if (response.updated > 0) parts.push(`${response.updated} actualizados`);
      toast.success(`Miembros: ${parts.length > 0 ? parts.join(', ') : '0 procesados'}`);
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

// License mutations
export const useImportLicensesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importExportService.importLicenses,
    onSuccess: (response) => {
      const parts = [];
      if (response.imported > 0) parts.push(`${response.imported} creadas`);
      if (response.updated > 0) parts.push(`${response.updated} actualizadas`);
      toast.success(`Licencias: ${parts.length > 0 ? parts.join(', ') : '0 procesadas'}`);
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
    },
    onError: (error: any) => {
      toast.error('Error al importar licencias');
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((err: string) => {
          toast.error(err);
        });
      }
    },
  });
};

export const useExportLicensesMutation = () => {
  return useMutation({
    mutationFn: (filters?: any) => importExportService.exportLicenses(filters),
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `licencias_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Licencias exportadas exitosamente');
    },
    onError: () => {
      toast.error('Error al exportar licencias');
    },
  });
};

// Insurance mutations
export const useImportInsurancesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importExportService.importInsurances,
    onSuccess: (response) => {
      const parts = [];
      if (response.imported > 0) parts.push(`${response.imported} creados`);
      if (response.updated > 0) parts.push(`${response.updated} actualizados`);
      toast.success(`Seguros: ${parts.length > 0 ? parts.join(', ') : '0 procesados'}`);
      queryClient.invalidateQueries({ queryKey: ['insurances'] });
    },
    onError: (error: any) => {
      toast.error('Error al importar seguros');
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((err: string) => {
          toast.error(err);
        });
      }
    },
  });
};

export const useExportInsurancesMutation = () => {
  return useMutation({
    mutationFn: (filters?: any) => importExportService.exportInsurances(filters),
    onSuccess: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `seguros_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Seguros exportados exitosamente');
    },
    onError: () => {
      toast.error('Error al exportar seguros');
    },
  });
};
