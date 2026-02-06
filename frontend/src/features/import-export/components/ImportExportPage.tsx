import { useState, ChangeEvent } from 'react';
import {
  useImportMembersMutation,
  useExportMembersMutation,
  useImportLicensesMutation,
  useExportLicensesMutation,
  useImportInsurancesMutation,
  useExportInsurancesMutation,
} from '../hooks/mutations/useImportExportMutations';
import { useMemberContext } from '@/features/members/hooks/useMemberContext';
import { usePermissions } from '@/core/hooks/usePermissions';
import { Upload, Download, FileSpreadsheet, Check, X, Users, Shield, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportResults {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

interface ImportCardProps {
  title: string;
  description: string;
  entityLabel: string;
  isPending: boolean;
  onImport: (data: Record<string, unknown>[]) => Promise<ImportResults>;
}

function ImportCard({ title, description, entityLabel, isPending, onImport }: ImportCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);

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
      processFile(droppedFiles[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Por favor selecciona un archivo Excel (.xlsx o .xls)');
      return;
    }
    setFile(selectedFile);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      const result = await onImport(jsonData);
      setImportResults(result);
    } catch {
      setImportResults({
        success: false,
        imported: 0,
        failed: 0,
        errors: ['Error al procesar el archivo'],
      });
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportResults(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
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
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <FileSpreadsheet className="w-12 h-12 text-gray-400" />
                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">Arrastra un archivo aquí o haz clic para seleccionar</p>
                    <p className="text-xs text-gray-500">Formatos soportados: .xlsx, .xls</p>
                  </>
                )}
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                <span className="text-sm text-blue-900">Archivo seleccionado: {file.name}</span>
                <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                  Cambiar
                </Button>
              </div>
            )}

            <Button
              onClick={() => file && processFile(file)}
              disabled={!file || isPending}
              className="w-full"
            >
              {isPending ? 'Importando...' : 'Importar'}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            {importResults.success ? (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-md">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Importación completada exitosamente</p>
                  <p className="text-xs text-green-700">{importResults.imported} {entityLabel} importados</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-md">
                <X className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">Error en la importación</p>
                  <p className="text-xs text-red-700">{importResults.failed} {entityLabel} fallidos</p>
                </div>
              </div>
            )}

            {importResults.errors?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Errores encontrados:</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importResults.errors.map((error, index) => (
                    <div key={index} className="text-xs p-2 bg-red-50 text-red-700 rounded break-words">
                      {String(error)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={resetImport} variant="outline" className="w-full">
              Importar Otro Archivo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const ImportExportPage = () => {
  const { isAssociationAdmin } = usePermissions();
  const isSuperAdmin = isAssociationAdmin();

  // Members
  const importMembersMutation = useImportMembersMutation();
  const exportMembersMutation = useExportMembersMutation();
  const { filters: memberFilters } = useMemberContext();

  // Licenses
  const importLicensesMutation = useImportLicensesMutation();
  const exportLicensesMutation = useExportLicensesMutation();
  const [licenseFilters, setLicenseFilters] = useState<Record<string, string>>({});

  // Insurances
  const importInsurancesMutation = useImportInsurancesMutation();
  const exportInsurancesMutation = useExportInsurancesMutation();
  const [insuranceFilters, setInsuranceFilters] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('members');

  const handleImportMembers = async (data: Record<string, unknown>[]): Promise<ImportResults> => {
    const result = await importMembersMutation.mutateAsync({ members: data as any });
    return {
      success: result.success,
      imported: result.imported,
      failed: result.failed,
      errors: result.errors || [],
    };
  };

  const handleImportLicenses = async (data: Record<string, unknown>[]): Promise<ImportResults> => {
    const result = await importLicensesMutation.mutateAsync({ licenses: data });
    return {
      success: result.success,
      imported: result.imported,
      failed: result.failed,
      errors: result.errors || [],
    };
  };

  const handleImportInsurances = async (data: Record<string, unknown>[]): Promise<ImportResults> => {
    const result = await importInsurancesMutation.mutateAsync({ insurances: data });
    return {
      success: result.success,
      imported: result.imported,
      failed: result.failed,
      errors: result.errors || [],
    };
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="members" className="gap-1.5">
          <Users className="w-4 h-4" />
          Miembros
        </TabsTrigger>
        {isSuperAdmin && (
          <>
            <TabsTrigger value="licenses" className="gap-1.5">
              <Shield className="w-4 h-4" />
              Licencias
            </TabsTrigger>
            <TabsTrigger value="insurances" className="gap-1.5">
              <HeartPulse className="w-4 h-4" />
              Seguros
            </TabsTrigger>
          </>
        )}
      </TabsList>

      {/* Members Tab */}
      <TabsContent value="members">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImportCard
            title="Importar Miembros"
            description="Importa datos de miembros desde un archivo Excel (.xlsx o .xls)"
            entityLabel="miembros"
            isPending={importMembersMutation.isPending}
            onImport={handleImportMembers}
          />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-green-600" />
                <CardTitle>Exportar Miembros</CardTitle>
              </div>
              <CardDescription>Exporta los datos de miembros a un archivo Excel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900">Filtros de exportación:</p>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Filtros actuales:</span>
                  {Object.entries(memberFilters).length === 0 ? (
                    <span className="text-gray-500"> Ninguno</span>
                  ) : (
                    <div className="mt-2 space-y-1">
                      {Object.entries(memberFilters).map(
                        ([key, value]) =>
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

              <Button
                onClick={() => exportMembersMutation.mutate(memberFilters)}
                disabled={exportMembersMutation.isPending}
                className="w-full"
              >
                {exportMembersMutation.isPending ? 'Exportando...' : 'Exportar Miembros'}
              </Button>

              <div className="text-xs text-gray-500">
                El archivo se descargará automáticamente con los filtros aplicados
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Licenses Tab */}
      {isSuperAdmin && (
        <TabsContent value="licenses">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImportCard
              title="Importar Licencias"
              description="Importa licencias desde un archivo Excel. Requiere DNI del miembro."
              entityLabel="licencias"
              isPending={importLicensesMutation.isPending}
              onImport={handleImportLicenses}
            />

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-600" />
                  <CardTitle>Exportar Licencias</CardTitle>
                </div>
                <CardDescription>Exporta las licencias a un archivo Excel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">Filtros de exportación:</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Estado</label>
                      <Select
                        value={licenseFilters.status || ''}
                        onValueChange={(value) =>
                          setLicenseFilters((prev) => ({
                            ...prev,
                            status: value === 'all' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Activa</SelectItem>
                          <SelectItem value="expired">Expirada</SelectItem>
                          <SelectItem value="pending">Pendiente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Grado Técnico</label>
                      <Select
                        value={licenseFilters.technical_grade || ''}
                        onValueChange={(value) =>
                          setLicenseFilters((prev) => ({
                            ...prev,
                            technical_grade: value === 'all' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="dan">Dan</SelectItem>
                          <SelectItem value="kyu">Kyu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label className="text-xs font-medium text-gray-700">Categoría Edad</label>
                      <Select
                        value={licenseFilters.age_category || ''}
                        onValueChange={(value) =>
                          setLicenseFilters((prev) => ({
                            ...prev,
                            age_category: value === 'all' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="adulto">Adulto</SelectItem>
                          <SelectItem value="infantil">Infantil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    const cleanFilters = Object.fromEntries(
                      Object.entries(licenseFilters).filter(([, v]) => v)
                    );
                    exportLicensesMutation.mutate(cleanFilters);
                  }}
                  disabled={exportLicensesMutation.isPending}
                  className="w-full"
                >
                  {exportLicensesMutation.isPending ? 'Exportando...' : 'Exportar Licencias'}
                </Button>

                <div className="text-xs text-gray-500">
                  Incluye nombre y DNI del miembro en la exportación
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      )}

      {/* Insurances Tab */}
      {isSuperAdmin && (
        <TabsContent value="insurances">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImportCard
              title="Importar Seguros"
              description="Importa seguros desde un archivo Excel. Requiere DNI del miembro."
              entityLabel="seguros"
              isPending={importInsurancesMutation.isPending}
              onImport={handleImportInsurances}
            />

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-600" />
                  <CardTitle>Exportar Seguros</CardTitle>
                </div>
                <CardDescription>Exporta los seguros a un archivo Excel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">Filtros de exportación:</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Estado</label>
                      <Select
                        value={insuranceFilters.status || ''}
                        onValueChange={(value) =>
                          setInsuranceFilters((prev) => ({
                            ...prev,
                            status: value === 'all' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="expired">Expirado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">Tipo Seguro</label>
                      <Select
                        value={insuranceFilters.insurance_type || ''}
                        onValueChange={(value) =>
                          setInsuranceFilters((prev) => ({
                            ...prev,
                            insurance_type: value === 'all' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="accident">Accidente</SelectItem>
                          <SelectItem value="civil_liability">RC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    const cleanFilters = Object.fromEntries(
                      Object.entries(insuranceFilters).filter(([, v]) => v)
                    );
                    exportInsurancesMutation.mutate(cleanFilters);
                  }}
                  disabled={exportInsurancesMutation.isPending}
                  className="w-full"
                >
                  {exportInsurancesMutation.isPending ? 'Exportando...' : 'Exportar Seguros'}
                </Button>

                <div className="text-xs text-gray-500">
                  Incluye nombre y DNI del miembro en la exportación
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
};
