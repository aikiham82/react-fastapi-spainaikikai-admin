import { foldForSearch } from '@/core/utils/search';
import { useMemo, useState } from 'react';
import { useClubPaymentsContext } from '../hooks/useClubPaymentsContext';
import { usePermissions } from '@/core/hooks/usePermissions';
import { useMembersQuery } from '@/features/members/hooks/queries/useMemberQueries';
import { ManualPaymentModal } from './ManualPaymentModal';
import { TransactionsSection } from './TransactionsSection';
import { ArrowLeft, HeartPulse, IdCard, Plus, type LucideIcon } from 'lucide-react';
import { Avatar, ProgressRing } from '@/components/ui/graphic';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ListToolbar, EmptyState, ListLoading, ListError } from '@/components/ui/list-controls';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { formatCurrency } from '@/core/utils/format';
import { seasonLabel } from '@/core/utils/defaultPaymentYear';

interface MemberStatus {
  tone: StatusTone;
  label: string;
}

const statusOf = (licensePaid: boolean, insurancePaid: boolean): MemberStatus => {
  if (licensePaid && insurancePaid) return { tone: 'ok', label: 'Al día' };
  if (licensePaid) return { tone: 'warn', label: 'Falta seguro' };
  if (insurancePaid) return { tone: 'warn', label: 'Falta licencia' };
  return { tone: 'neutral', label: 'Pendiente' };
};

interface PaidMarkProps {
  icon: LucideIcon;
  paid: boolean;
  label: string;
}

const PaidMark = ({ icon: Icon, paid, label }: PaidMarkProps) => (
  <span
    role="img"
    title={label}
    aria-label={label}
    className={cn(
      'grid size-[30px] shrink-0 place-items-center rounded-lg',
      paid ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
    )}
  >
    <Icon className="size-4" aria-hidden="true" />
  </span>
);

export const ClubPaymentDetail = () => {
  const {
    isSuperAdmin,
    clubDetail,
    isLoadingClubDetail,
    clubDetailError,
    goBackToList,
    selectedYear,
  } = useClubPaymentsContext();

  const { isAssociationAdmin } = usePermissions();
  const canManagePayments = isAssociationAdmin();

  const [searchTerm, setSearchTerm] = useState('');
  const [isManualPaymentOpen, setIsManualPaymentOpen] = useState(false);

  const { data: membersData, isLoading: isLoadingMembers } = useMembersQuery(
    { club_id: clubDetail?.club_id ?? '', status: 'active', limit: 0 },
    { enabled: canManagePayments && !!clubDetail?.club_id && isManualPaymentOpen }
  );
  const modalMembers = useMemo(
    () =>
      (membersData ?? []).map((m) => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name}`.trim(),
      })),
    [membersData],
  );

  if (isLoadingClubDetail) {
    return <ListLoading />;
  }

  if (clubDetailError) {
    return <ListError title="Error al cargar los datos del club" description={clubDetailError.message} />;
  }

  if (!clubDetail) {
    return <EmptyState title="No se encontraron datos de pagos" />;
  }

  const members = clubDetail.members ?? [];
  const upToDate = members.filter((m) => m.license_paid && m.insurance_paid).length;
  const filtered = members.filter((m) => foldForSearch(m.member_name).includes(foldForSearch(searchTerm)));

  return (
    <div className="flex flex-col gap-6">
      {isSuperAdmin && (
        <Button variant="ghost" onClick={goBackToList} className="-ml-3 self-start gap-2">
          <ArrowLeft className="size-4" />
          Volver al listado
        </Button>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{clubDetail.club_name}</h2>
          <p className="text-sm text-muted-foreground">
            Seguros de la temporada {seasonLabel(clubDetail.payment_year)}
          </p>
        </div>
        {canManagePayments && (
          <Button onClick={() => setIsManualPaymentOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Registrar pago manual
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 rounded-[18px] bg-card p-4 shadow-card sm:p-5">
        <ProgressRing value={upToDate} max={clubDetail.total_members} label="Miembros al día" />
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <p className="text-[15px] text-foreground">
            <span className="text-2xl font-bold tabular-nums">
              {upToDate} de {clubDetail.total_members}
            </span>{' '}
            al día
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={clubDetail.has_club_fee ? 'ok' : 'neutral'}>
              {clubDetail.has_club_fee ? 'Cuota pagada' : 'Cuota pendiente'}
            </StatusBadge>
            <span className="text-sm text-muted-foreground">Cobrado {formatCurrency(clubDetail.total_collected)}</span>
          </div>
        </div>
      </div>

      <ListToolbar search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Buscar miembro...' }} />

      {filtered.length === 0 ? (
        <EmptyState title="No se encontraron miembros con los filtros seleccionados" />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((member) => {
            const status = statusOf(member.license_paid, member.insurance_paid);
            return (
              <li key={member.member_id} className="flex items-center gap-3 rounded-[18px] bg-card p-3 shadow-card">
                <Avatar name={member.member_name} size="md" />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
                  <p className="min-w-0 basis-full break-words text-[15px] font-semibold text-foreground sm:flex-1 sm:basis-auto">
                    {member.member_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <PaidMark
                      icon={IdCard}
                      paid={member.license_paid}
                      label={member.license_paid ? 'Licencia pagada' : 'Licencia sin pagar'}
                    />
                    <PaidMark
                      icon={HeartPulse}
                      paid={member.insurance_paid}
                      label={member.insurance_paid ? 'Seguro pagado' : 'Seguro sin pagar'}
                    />
                    {member.total_paid > 0 && (
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(member.total_paid)}
                      </span>
                    )}
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canManagePayments && (
        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-foreground">Transacciones</h3>
          <TransactionsSection clubId={clubDetail.club_id} paymentYear={selectedYear} />
        </section>
      )}

      {canManagePayments && (
        <ManualPaymentModal
          isOpen={isManualPaymentOpen}
          onClose={() => setIsManualPaymentOpen(false)}
          clubId={clubDetail.club_id}
          clubName={clubDetail.club_name}
          paymentYear={selectedYear}
          members={modalMembers}
          isLoadingMembers={isLoadingMembers}
        />
      )}
    </div>
  );
};
