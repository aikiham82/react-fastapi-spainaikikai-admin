import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/core/utils/format';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';
import {
  CHOOSABLE_LICENCE_ITEMS,
  INSURANCE_LABELS,
  LICENCE_LABELS,
  pendingInsuranceOf,
  tickedItemsOf,
  tickedLicenceOf,
  type ChecklistRow,
  type LicenceItem,
} from '../utils/payment-checklist';

interface TickOptionProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  detail?: string;
}

const TickOption = ({ id, label, checked, onChange, disabled, detail }: TickOptionProps) => (
  <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-foreground">
    <Checkbox id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} className="size-5" />
    <span>{label}</span>
    {detail && <span className="ml-auto text-sm tabular-nums text-muted-foreground">{detail}</span>}
  </label>
);

const LicenceOption = ({ row, ticked }: { row: ChecklistRow; ticked: Set<string> }) => {
  const { toggleMemberItems, chooseMemberLicence, isSubmitting } = useAnnualPaymentContext();
  const licence = tickedLicenceOf(ticked, row);

  return (
    <div>
      <TickOption
        id={`${row.memberId}-licence`}
        label={LICENCE_LABELS[licence]}
        checked={ticked.has(licence)}
        disabled={isSubmitting}
        onChange={() => toggleMemberItems(row, [licence])}
      />
      {row.licenceChoosable && (
        <select
          aria-label={`Tipo de licencia de ${row.memberName}`}
          value={licence}
          disabled={isSubmitting}
          onChange={(e) => chooseMemberLicence(row, e.target.value as LicenceItem)}
          className="ml-8 h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground pointer-coarse:h-11"
        >
          {CHOOSABLE_LICENCE_ITEMS.map((item) => (
            <option key={item} value={item}>
              {LICENCE_LABELS[item]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

const MemberRow = ({ row }: { row: ChecklistRow }) => {
  const { formData, toggleMemberItems, isSubmitting } = useAnnualPaymentContext();
  const ticked = tickedItemsOf(formData.member_assignments, row.memberId);
  const insurance = pendingInsuranceOf(row);

  return (
    <div
      role="group"
      aria-label={row.memberName}
      className={cn(
        'grid gap-x-6 gap-y-1 border-b border-border py-3 xl:grid-cols-[minmax(0,1fr)_15rem_15rem] xl:items-start',
        row.isUpToDate && 'opacity-60'
      )}
    >
      <div className="min-w-0 xl:pt-2.5">
        <p className="break-words text-[15px] font-semibold text-foreground">{row.memberName}</p>
        <p className="truncate text-sm text-muted-foreground">{row.grade}</p>
      </div>

      {row.isUpToDate ? (
        <div className="xl:col-span-2 xl:pt-2.5">
          <StatusBadge tone="ok">Al día</StatusBadge>
        </div>
      ) : (
        <>
          {row.licencePaid ? (
            <div className="xl:pt-2.5">
              <StatusBadge tone="ok">Licencia pagada</StatusBadge>
            </div>
          ) : (
            <LicenceOption row={row} ticked={ticked} />
          )}
          <div>
            {insurance.length === 0 ? (
              <div className="xl:pt-2.5">
                <StatusBadge tone="ok">Seguro pagado</StatusBadge>
              </div>
            ) : (
              insurance.map((item) => (
                <TickOption
                  key={item}
                  id={`${row.memberId}-${item}`}
                  label={INSURANCE_LABELS[item]}
                  checked={ticked.has(item)}
                  disabled={isSubmitting}
                  onChange={() => toggleMemberItems(row, [item])}
                />
              ))
            )}
            {!row.offersRc && <p className="pl-8 text-[13px] text-muted-foreground">El título ya incluye el seguro RC</p>}
          </div>
        </>
      )}
    </div>
  );
};

export const PaymentChecklist = () => {
  const {
    rows,
    formData,
    setField,
    prices,
    clubFeeAlreadyPaid,
    tickEverythingPending,
    isSubmitting,
    isLoadingMembers,
  } = useAnnualPaymentContext();

  if (isLoadingMembers) {
    return <p className="py-8 text-sm text-muted-foreground">Cargando miembros...</p>;
  }

  return (
    <section aria-labelledby="checklist-title" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <h2 id="checklist-title" className="text-lg font-semibold text-foreground">
          Marca qué pagas de cada miembro
        </h2>
        <Button type="button" variant="outline" onClick={tickEverythingPending} disabled={isSubmitting}>
          Marcar todo lo pendiente
        </Button>
      </div>

      <div className="border-b border-border py-1">
        {clubFeeAlreadyPaid ? (
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-[15px] font-semibold text-foreground">Cuota anual del club</span>
            <StatusBadge tone="ok">Al día</StatusBadge>
          </div>
        ) : (
          <TickOption
            id="club-fee"
            label="Cuota anual del club"
            detail={prices?.club_fee === undefined ? undefined : formatCurrency(prices.club_fee)}
            checked={formData.include_club_fee}
            disabled={isSubmitting}
            onChange={() => setField('include_club_fee', !formData.include_club_fee)}
          />
        )}
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">Este club no tiene miembros activos.</p>
      ) : (
        rows.map((row) => <MemberRow key={row.memberId} row={row} />)
      )}
    </section>
  );
};
