import { ImportExportPage } from './features/import-export/components/ImportExportPage';

export const ImportExportPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar / Exportar</h1>
        <p className="text-gray-600 mt-1">Gestiona la importación y exportación de datos</p>
      </div>
      <ImportExportPage />
    </div>
  );
};
