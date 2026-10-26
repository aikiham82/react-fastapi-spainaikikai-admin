import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMemberContext } from '@/features/members/hooks/useMemberContext';
import {
  useExportMembersMutation,
  useExportLicensesMutation,
  useExportInsurancesMutation,
  useExportPaymentsMutation,
} from '../hooks/mutations/useImportExportMutations';
import {
  EXPORT_FILTERS,
  KIND_CONFIG,
  type ImportExportKind,
} from '../data/importExportConfig';
import { ColumnSelector } from './ColumnSelector';
import { KindSelect } from './KindSelect';

interface ExportSectionProps {
  kinds: ImportExportKind[];
}

const omitPaging = <T extends object>(filters: T): Record<string, unknown> =>
  Object.fromEntries(Object.entries(filters).filter(([key]) => key !== 'limit' && key !== 'offset'));

const allColumnKeys = (kind: ImportExportKind) => KIND_CONFIG[kind].columns.map((c) => c.key);

export function ExportSection({ kinds }: ExportSectionProps) {
  const [kind, setKind] = useState<ImportExportKind>(kinds[0]);
  const exportMembers = useExportMembersMutation();
  const exportLicenses = useExportLicensesMutation();
  const exportInsurances = useExportInsurancesMutation();
  const exportPayments = useExportPaymentsMutation();
  const { filters: memberFilters } = useMemberContext();

  const currentYear = new Date().getFullYear();
  const paymentYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const [columnsByKind, setColumnsByKind] = useState<Record<ImportExportKind, string[]>>({
    members: allColumnKeys('members'),
    licenses: allColumnKeys('licenses'),
    insurances: allColumnKeys('insurances'),
    payments: allColumnKeys('payments'),
  });
  const [filtersByKind, setFiltersByKind] = useState<Record<string, Record<string, string>>>({});
  const [paymentYear, setPaymentYear] = useState<number>(currentYear);

  const columns = columnsByKind[kind];
  const config = KIND_CONFIG[kind];
  const filterConfigs = EXPORT_FILTERS[kind] ?? [];
  const kindFilters = filtersByKind[kind] ?? {};

  const mutations = {
    members: exportMembers,
    licenses: exportLicenses,
    insurances: exportInsurances,
    payments: exportPayments,
  };
  const isPending = mutations[kind].isPending;

  const columnsParam = columns.length < config.columns.length ? columns.join(',') : undefined;

  const download = () => {
    const cleanFilters = Object.fromEntries(Object.entries(kindFilters).filter(([, value]) => value));
    if (kind === 'members') {
      exportMembers.mutate({ ...omitPaging(memberFilters), columns: columnsParam });
    } else if (kind === 'licenses') {
      exportLicenses.mutate({ ...cleanFilters, columns: columnsParam });
    } else if (kind === 'insurances') {
      exportInsurances.mutate({ ...cleanFilters, columns: columnsParam });
    } else {
      exportPayments.mutate({ payment_year: paymentYear, columns: columnsParam });
    }
  };

  const setColumns = (next: string[]) => setColumnsByKind((prev) => ({ ...prev, [kind]: next }));
  const setFilter = (key: string, value: string) =>
    setFiltersByKind((prev) => ({ ...prev, [kind]: { ...prev[kind], [key]: value === 'all' ? '' : value } }));

  const hasMemberFilters = Object.values(omitPaging(memberFilters)).some(Boolean);

  return (
    <section aria-labelledby="export-title" className="space-y-5">
      <div className="space-y-1">
        <h2 id="export-title" className="text-lg font-semibold text-foreground">
          Descargar Excel
        </h2>
        <p className="text-sm text-muted-foreground">Guarda en tu ordenador un Excel con los datos.</p>
      </div>

      <KindSelect id="export-kind" label="¿Qué quieres descargar?" kinds={kinds} value={kind} onChange={setKind} />

      {kind === 'members' && hasMemberFilters && (
        <p className="text-sm text-muted-foreground">Se descargan solo los miembros que has filtrado en la lista.</p>
      )}

      <details className="group rounded-md border border-border">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium text-foreground">
          Opciones
        </summary>
        <div className="space-y-5 border-t border-border p-4">
          {filterConfigs.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {filterConfigs.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <Label htmlFor={`export-${kind}-${filter.key}`}>{filter.label}</Label>
                  <Select value={kindFilters[filter.key] || 'all'} onValueChange={(value) => setFilter(filter.key, value)}>
                    <SelectTrigger id={`export-${kind}-${filter.key}`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
          {kind === 'payments' && (
            <div className="space-y-2 sm:max-w-xs">
              <Label htmlFor="export-payments-year">Año</Label>
              <Select value={String(paymentYear)} onValueChange={(value) => setPaymentYear(Number(value))}>
                <SelectTrigger id="export-payments-year" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentYears.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <ColumnSelector columns={config.columns} selectedKeys={columns} onChange={setColumns} />
        </div>
      </details>

      <Button onClick={() => download()} disabled={isPending || columns.length === 0} className="w-full sm:w-auto">
        {isPending ? 'Descargando...' : 'Descargar Excel'}
      </Button>
    </section>
  );
}
