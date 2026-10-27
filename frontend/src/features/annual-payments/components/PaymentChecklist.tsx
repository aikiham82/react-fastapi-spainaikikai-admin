import type { ReactNode } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar, BeltBadge, IconTile, TickChip } from '@/components/ui/graphic';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/core/utils/format';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';
import type { AnnualPaymentPrices } from '../data/schemas/annual-payment.schema';
import {
  LICENCE_LABELS,
  pendingInsuranceOf,
  tickedItemsOf,
  tickedLicenceOf,
  type ChecklistRow,
  type LicenceItem,
} from '../utils/payment-checklist';

const CHIP_LABELS: Record<'seguro_accidentes' | 'seguro_rc', string> = {
  seguro_accidentes: 'Accidentes',
  seguro_rc: 'RC',
};

const priceOf = (prices: AnnualPaymentPrices | null, item: keyof AnnualPaymentPrices): string | undefined => {
  const price = prices?.[item];
  return price == null ? undefined : formatCurrency(price);
};

const CARD = 'rounded-[18px] bg-card p-4 shadow-card lg:rounded-none lg:shadow-none';

const LicenceChip = ({ row, ticked }: { row: ChecklistRow; ticked: Set<string> }) => {
  const { toggleMemberItems, chooseMemberLicence, isSubmitting, prices } = useAnnualPaymentContext();
  const licence = tickedLicenceOf(ticked, row);

  return (
    <>
      <TickChip
        label={LICENCE_LABELS[licence]}
        price={priceOf(prices, licence)}
        checked={ticked.has(licence)}
        disabled={isSubmitting}
        onCheckedChange={() => toggleMemberItems(row, [licence])}
      />
      {row.licenceChoices.length > 1 && (
        <select
          aria-label={`Tipo de licencia de ${row.memberName}`}
          value={licence}
          disabled={isSubmitting}
          onChange={(e) => chooseMemberLicence(row, e.target.value as LicenceItem)}
          className="h-10 rounded-full border border-input bg-card px-3 text-sm text-foreground pointer-coarse:h-11"
        >
          {row.licenceChoices.map((item) => (
            <option key={item} value={item}>
              {LICENCE_LABELS[item]}
            </option>
          ))}
        </select>
      )}
    </>
  );
};

const MemberHeading = ({ row, children }: { row: ChecklistRow; children?: ReactNode }) => (
  <div className="flex items-start gap-3">
    <Avatar name={row.memberName} size="md" />
    <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
      <p className="break-words text-[15px] font-semibold text-foreground">{row.memberName}</p>
      <BeltBadge grade={row.grade} />
    </div>
    {children}
  </div>
);

const MemberRow = ({ row }: { row: ChecklistRow }) => {
  const { formData, toggleMemberItems, isSubmitting, prices } = useAnnualPaymentContext();
  const ticked = tickedItemsOf(formData.member_assignments, row.memberId);
  const insurance = pendingInsuranceOf(row);

  if (row.isUpToDate) {
    return (
      <div
        role="group"
        aria-label={row.memberName}
        className={cn(CARD, 'bg-success-soft shadow-none lg:bg-success-soft')}
      >
        <MemberHeading row={row}>
          <StatusBadge tone="ok" className="ml-auto self-center">
            Al día
          </StatusBadge>
        </MemberHeading>
      </div>
    );
  }

  return (
    <div role="group" aria-label={row.memberName} data-member-id={row.memberId} className={cn(CARD, 'flex flex-col gap-3')}>
      <MemberHeading row={row} />
      <div className="flex flex-wrap items-center gap-2 sm:pl-[52px]">
        {row.licencePaid ? (
          <StatusBadge tone="ok">Licencia pagada</StatusBadge>
        ) : (
          <LicenceChip row={row} ticked={ticked} />
        )}
        {insurance.length === 0 ? (
          <StatusBadge tone="ok">Seguro pagado</StatusBadge>
        ) : (
          insurance.map((item) => (
            <TickChip
              key={item}
              label={CHIP_LABELS[item]}
              price={priceOf(prices, item)}
              checked={ticked.has(item)}
              disabled={isSubmitting}
              onCheckedChange={() => toggleMemberItems(row, [item])}
            />
          ))
        )}
      </div>
      {!row.offersRc && (
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground sm:pl-[52px]">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
          El título ya incluye el seguro RC
        </p>
      )}
    </div>
  );
};

const ClubFeeRow = () => {
  const { formData, setField, prices, clubFeeAlreadyPaid, isSubmitting } = useAnnualPaymentContext();

  return (
    <div className={cn(CARD, 'flex items-center gap-3')}>
      <IconTile icon={Building2} tone="brand" />
      <span className="min-w-0 flex-1 text-[15px] font-semibold text-foreground">
        Cuota <span className="hidden sm:inline">anual </span>del club
      </span>
      {clubFeeAlreadyPaid ? (
        <StatusBadge tone="ok">Al día</StatusBadge>
      ) : (
        <TickChip
          label="Cuota"
          price={priceOf(prices, 'club_fee')}
          checked={formData.include_club_fee}
          disabled={isSubmitting}
          onCheckedChange={() => setField('include_club_fee', !formData.include_club_fee)}
        />
      )}
    </div>
  );
};

export const PaymentChecklist = () => {
  const { rows, tickEverythingPending, isSubmitting, isLoadingMembers } = useAnnualPaymentContext();

  if (isLoadingMembers) {
    return <p className="py-8 text-sm text-muted-foreground">Cargando miembros...</p>;
  }

  return (
    <section aria-labelledby="checklist-title" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="checklist-title" className="text-lg font-semibold text-foreground">
          Marca qué pagas de cada miembro
        </h2>
        <Button type="button" variant="outline" className="h-11" onClick={tickEverythingPending} disabled={isSubmitting}>
          Marcar todo lo pendiente
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:gap-0 lg:divide-y lg:divide-border lg:overflow-hidden lg:rounded-[18px] lg:bg-card lg:shadow-card">
        <ClubFeeRow />
        {rows.length === 0 ? (
          <p className="p-4 py-8 text-sm text-muted-foreground">Este club no tiene miembros activos.</p>
        ) : (
          rows.map((row) => <MemberRow key={row.memberId} row={row} />)
        )}
      </div>
    </section>
  );
};
