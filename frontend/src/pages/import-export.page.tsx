import { ImportExportPage as ImportExportContent } from '@/features/import-export/components/ImportExportPage';
import { MemberProvider } from '@/features/members/hooks/useMemberContext';

export const ImportExportPage = () => {
  return (
    <MemberProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importar / Exportar</h1>
          <p className="text-gray-600 mt-1">Gestiona la importación y exportación de datos</p>
        </div>
        <ImportExportContent />
      </div>
    </MemberProvider>
  );
};
