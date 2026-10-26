import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatDate } from '@/core/utils/format';
import type { Insurance } from '../data/schemas/insurance.schema';
import { insuranceStatus, insuranceTypeLabel } from './insuranceDisplay';

interface InsuranceDetailDialogProps {
  insurance: Insurance | null;
  onClose: () => void;
  onEdit?: (insurance: Insurance) => void;
  onDelete?: (insurance: Insurance) => void;
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 text-[15px] text-foreground">{children}</dd>
  </div>
);

export const InsuranceDetailDialog = ({ insurance, onClose, onEdit, onDelete }: InsuranceDetailDialogProps) => {
  const status = insurance ? insuranceStatus(insurance) : null;

  return (
    <Dialog open={!!insurance} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        {insurance && status && (
          <>
            <DialogHeader>
              <DialogTitle>Seguro de {insuranceTypeLabel(insurance.insurance_type).toLowerCase()}</DialogTitle>
              <DialogDescription className="sr-only">Datos del seguro</DialogDescription>
            </DialogHeader>
            <dl className="space-y-4 py-2">
              {insurance.member_name && <Field label="Miembro">{insurance.member_name}</Field>}
              <Field label="Estado">
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Desde">{formatDate(insurance.start_date)}</Field>
                <Field label="Hasta">{formatDate(insurance.end_date)}</Field>
              </div>
              {insurance.insurance_company && <Field label="Compañía aseguradora">{insurance.insurance_company}</Field>}
              {insurance.policy_number && <Field label="Número de póliza">{insurance.policy_number}</Field>}
              {!!insurance.coverage_amount && (
                <Field label="Cobertura">
                  <span className="tabular-nums">{formatCurrency(insurance.coverage_amount)}</span>
                </Field>
              )}
            </dl>
            {(onEdit || onDelete) && (
              <DialogFooter>
                {onDelete && (
                  <Button variant="outline" className="text-danger" onClick={() => onDelete(insurance)}>
                    Eliminar
                  </Button>
                )}
                {onEdit && <Button onClick={() => onEdit(insurance)}>Editar</Button>}
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
