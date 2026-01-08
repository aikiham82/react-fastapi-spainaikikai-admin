import { useState, ChangeEvent } from 'react';
import { useImportMembersMutation, useExportMembersMutation } from '../hooks/mutations/useImportExportMutations';
import { useMemberContext } from '@/features/members/hooks/useMemberContext';
import { Upload, Download, FileSpreadsheet, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const ImportExportPage = () => {
  const importMutation = useImportMembersMutation();
  const exportMutation = useExportMembersMutation();
  const { filters } = useMemberContext();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: boolean;
    imported: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragover' || e.type === 'dragenter');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles?.length) {
      handleFileSelect(droppedFiles[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Por favor selecciona un archivo Excel (.xlsx o .xls)');
      return;
    }

    setFile(selectedFile);

    try {
      const parsedData = await importMutation.mutateAsync({ members: [] });

      setImportResults({
        success: parsedData.success,
        imported: parsedData.imported,
        failed: parsedData.failed,
        errors: parsedData.errors || [],
      });
    } catch (error) {
      setImportResults({
        success: false,
        imported: 0,
        failed: 0,
        errors: ['Error al procesar el archivo'],
      });
    }
  };

  const handleExport = () => {
    exportMutation.mutate(filters);
  };

  const resetImport = () => {
    setFile(null);
    setImportResults(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar / Exportar Datos</h1>
        <p className="text-gray-600 mt-1">Gestiona la importación y exportación de datos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <CardTitle>Importar Miembros</CardTitle>
            </div>
            <CardDescription>
              Importa datos de miembros desde un archivo Excel (.xlsx o .xls)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!importResults ? (
              <>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileSpreadsheet className="w-12 h-12 text-gray-400" />
                    {file ? (
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">
                          Arrastra un archivo aquí o haz clic para seleccionar
                        </p>
                        <p className="text-xs text-gray-500">
                          Formatos soportados: .xlsx, .xls
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                    <span className="text-sm text-blue-900">
                      Archivo seleccionado: {file.name}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      Cambiar
                    </Button>
                  </div>
                )}

                <Button
                  onClick={() => file && importMutation.mutate({ members: [] })}
                  disabled={!file || importMutation.isPending}
                  className="w-full"
                >
                  {importMutation.isPending ? 'Importando...' : 'Importar'}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                {importResults.success ? (
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-md">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Importación completada exitosamente
                      </p>
                      <p className="text-xs text-green-700">
                        {importResults.imported} miembros importados
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-md">
                    <X className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-900">
                        Error en la importación
                      </p>
                      <p className="text-xs text-red-700">
                        {importResults.failed} miembros fallidos
                      </p>
                    </div>
                  </div>
                )}

                {importResults.errors?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">
                      Errores encontrados:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResults.errors.map((error, index) => (
                        <div
                          key={index}
                          className="text-xs p-2 bg-red-50 text-red-700 rounded"
                        >
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={resetImport}
                  variant="outline"
                  className="w-full"
                >
                  Importar Otro Archivo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600" />
              <CardTitle>Exportar Miembros</CardTitle>
            </div>
            <CardDescription>
              Exporta los datos de miembros a un archivo Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Filtros de exportación:
                </p>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Filtros actuales:</span>
                    {Object.entries(filters).length === 0 ? (
                      <span className="text-gray-500"> Ninguno</span>
                    ) : (
                      <div className="mt-2 space-y-1">
                        {Object.entries(filters).map(([key, value]) =>
                          value && (
                            <div key={key} className="text-xs">
                              <span className="font-medium">{key}:</span> {String(value)}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="w-full"
            >
              {exportMutation.isPending ? 'Exportando...' : 'Exportar Miembros'}
            </Button>

            <div className="text-xs text-gray-500">
              El archivo se descargará automáticamente con los filtros aplicados
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
