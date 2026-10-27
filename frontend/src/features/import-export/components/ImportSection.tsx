import { useState, type ChangeEvent, type DragEvent } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { CircleCheck, CircleX, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/graphic';
import { TextButton } from '@/components/ui/text-link';
import { cn } from '@/lib/utils';
import {
  useImportMembersMutation,
  useImportLicensesMutation,
  useImportInsurancesMutation,
  useImportPaymentsMutation,
  useExportMembersMutation,
  useExportLicensesMutation,
  useExportInsurancesMutation,
  useExportPaymentsMutation,
} from '../hooks/mutations/useImportExportMutations';
import { KIND_CONFIG, type ImportExportKind } from '../data/importExportConfig';
import { formatFileSize } from '../utils/formatFileSize';
import { KindSelect } from './KindSelect';

interface ImportResults {
  success: boolean;
  imported: number;
  updated: number;
  failed: number;
  errors: string[];
}

type Row = Record<string, unknown>;

interface ImportSectionProps {
  kinds: ImportExportKind[];
}

const normalise = (result: {
  success: boolean;
  imported: number;
  updated?: number;
  failed: number;
  errors?: string[];
}): ImportResults => ({
  success: result.success,
  imported: result.imported,
  updated: result.updated || 0,
  failed: result.failed,
  errors: result.errors || [],
});

const isExcel = (name: string) => name.endsWith('.xlsx') || name.endsWith('.xls');

export function ImportSection({ kinds }: ImportSectionProps) {
  const [kind, setKind] = useState<ImportExportKind>(kinds[0]);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);

  const importMembers = useImportMembersMutation();
  const importLicenses = useImportLicensesMutation();
  const importInsurances = useImportInsurancesMutation();
  const importPayments = useImportPaymentsMutation();
  const exportMembers = useExportMembersMutation();
  const exportLicenses = useExportLicensesMutation();
  const exportInsurances = useExportInsurancesMutation();
  const exportPayments = useExportPaymentsMutation();

  const config = KIND_CONFIG[kind];
  const isPending = {
    members: importMembers,
    licenses: importLicenses,
    insurances: importInsurances,
    payments: importPayments,
  }[kind].isPending;

  const runImport = async (rows: Row[]): Promise<ImportResults> => {
    if (kind === 'members') return normalise(await importMembers.mutateAsync({ members: rows, mode: 'upsert' }));
    if (kind === 'licenses') return normalise(await importLicenses.mutateAsync({ licenses: rows, mode: 'upsert' }));
    if (kind === 'insurances') return normalise(await importInsurances.mutateAsync({ insurances: rows, mode: 'upsert' }));
    return normalise(await importPayments.mutateAsync({ payments: rows, mode: 'upsert' }));
  };

  const downloadTemplate = () => {
    if (kind === 'members') exportMembers.mutate({});
    else if (kind === 'licenses') exportLicenses.mutate({});
    else if (kind === 'insurances') exportInsurances.mutate({});
    else exportPayments.mutate({ payment_year: new Date().getFullYear() });
  };

  const chooseFile = (selected: File) => {
    if (!isExcel(selected.name)) {
      toast.error('Por favor selecciona un archivo Excel (.xlsx o .xls)');
      return;
    }
    setFile(selected);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) chooseFile(selected);
    e.target.value = '';
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragover' || e.type === 'dragenter');
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) chooseFile(dropped);
  };

  const handleImport = async () => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet) as Row[];
      setResults(await runImport(rows));
    } catch {
      setResults({ success: false, imported: 0, updated: 0, failed: 0, errors: ['Error al procesar el archivo'] });
    }
  };

  const reset = () => {
    setFile(null);
    setResults(null);
  };

  const changeKind = (next: ImportExportKind) => {
    setKind(next);
    reset();
  };

  const summary = results
    ? [
        results.imported > 0 && `${results.imported} ${config.entityLabel} creados`,
        results.updated > 0 && `${results.updated} ${config.entityLabel} actualizados`,
        results.imported === 0 && results.updated === 0 && `0 ${config.entityLabel} procesados`,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <section aria-labelledby="import-title" className="min-w-0 space-y-5 rounded-[18px] bg-card p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-3">
        <IconTile icon={Upload} tone="brand" />
        <div className="min-w-0">
          <h2 id="import-title" className="text-lg font-semibold text-foreground">
            Subir Excel
          </h2>
          <p className="text-sm text-muted-foreground">Añade o actualiza datos desde un Excel.</p>
        </div>
      </div>

      <KindSelect id="import-kind" label="¿Qué quieres subir?" kinds={kinds} value={kind} onChange={changeKind} />

      {results ? (
        <div className="space-y-4">
          {results.success ? (
            <div role="status" className="flex items-start gap-3 rounded-xl bg-success-soft p-4 text-success">
              <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">Importación completada</p>
                <p className="text-sm">{summary}</p>
              </div>
            </div>
          ) : (
            <div role="alert" className="flex items-start gap-3 rounded-xl bg-danger-soft p-4 text-danger">
              <CircleX className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">No se pudo importar el archivo</p>
                <p className="text-sm">
                  {results.failed} {config.entityLabel} con error
                </p>
              </div>
            </div>
          )}

          {results.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Errores encontrados</p>
              <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                {results.errors.map((error, index) => (
                  <li key={index} className="break-words p-2 text-sm text-danger">
                    {String(error)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="outline" onClick={reset} className="min-h-11 w-full sm:w-auto">
            <Upload className="size-4" aria-hidden="true" />
            Subir otro archivo
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              'relative flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
              dragActive || file ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary hover:bg-primary-soft'
            )}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              aria-label="Archivo Excel"
              aria-describedby="import-format"
              onChange={handleInputChange}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <span className="grid size-12 place-items-center rounded-full bg-card text-primary shadow-card" aria-hidden="true">
              {file ? <FileSpreadsheet className="size-6" /> : <Upload className="size-6" />}
            </span>
            {file ? (
              <div className="min-w-0 space-y-0.5">
                <p className="break-all text-sm font-semibold text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                <p className="text-sm text-muted-foreground">Toca para elegir otro archivo</p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-foreground">Toca para elegir un archivo o arrástralo aquí</p>
            )}
            <p id="import-format" className={cn('text-sm text-muted-foreground', file && 'sr-only')}>
              Archivo .xlsx con la primera fila de títulos
            </p>
          </div>

          {config.importHint && <p className="text-sm text-muted-foreground">{config.importHint}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={handleImport} disabled={!file || isPending} className="min-h-11 w-full sm:w-auto">
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
              {isPending ? 'Importando...' : 'Importar'}
            </Button>
            {!file && <p className="text-sm text-muted-foreground">Elige un archivo primero</p>}
            {file && (
              <Button variant="ghost" onClick={() => setFile(null)} className="min-h-11 w-full sm:w-auto">
                Quitar archivo
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            ¿No sabes cómo preparar el archivo?{' '}
            <TextButton variant="inline" onClick={downloadTemplate}>
              Descargar plantilla
            </TextButton>
            . Es tu Excel actual, para que lo uses como punto de partida.
          </p>
        </div>
      )}
    </section>
  );
}
