import { useState } from 'react';
import { useClubPaymentsContext } from '../hooks/useClubPaymentsContext';
import { usePermissions } from '@/core/hooks/usePermissions';
import { useMembersQuery } from '@/features/members/hooks/queries/useMemberQueries';
import { ManualPaymentModal } from './ManualPaymentModal';
import { TransactionsSection } from './TransactionsSection';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListToolbar, EmptyState } from '@/components/ui/list-controls';
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
    { enabled: canManagePayments && !!clubDetail?.club_id }
  );
  const modalMembers = (membersData ?? []).map((m) => ({
    id: m.id,
    name: `${m.first_name} ${m.last_name}`.trim(),
  }));

  if (isLoadingClubDetail) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  if (clubDetailError) {
    return (
      <div className="py-12">
        <p className="text-danger">Error al cargar los datos del club</p>
        <p className="mt-2 text-sm text-muted-foreground">{clubDetailError.message}</p>
      </div>
    );
  }

  if (!clubDetail) {
    return <p className="py-12 text-muted-foreground">No se encontraron datos de pagos</p>;
  }

  const members = clubDetail.members ?? [];
  const upToDate = members.filter((m) => m.license_paid && m.insurance_paid).length;
  const filtered = members.filter((m) => m.member_name.toLowerCase().includes(searchTerm.toLowerCase()));

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

      <p className="text-[15px] text-foreground">
        <span className="font-semibold tabular-nums">
          {upToDate} de {clubDetail.total_members} miembros al día
        </span>
        <span className="text-muted-foreground">
          {' · '}Cuota del club: {clubDetail.has_club_fee ? 'pagada' : 'pendiente'}
          {' · '}Cobrado {formatCurrency(clubDetail.total_collected)}
        </span>
      </p>

      <ListToolbar search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Buscar miembro...' }} />

      {filtered.length === 0 ? (
        <EmptyState title="No se encontraron miembros con los filtros seleccionados" />
      ) : (
        <ul className="border-t border-border">
          {filtered.map((member) => {
            const status = statusOf(member.license_paid, member.insurance_paid);
            return (
              <li
                key={member.member_id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-foreground">{member.member_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Licencia {member.license_paid ? 'pagada' : 'sin pagar'} · Seguro{' '}
                    {member.insurance_paid ? 'pagado' : 'sin pagar'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {member.total_paid > 0 && (
                    <span className="text-sm tabular-nums text-muted-foreground">{formatCurrency(member.total_paid)}</span>
                  )}
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
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
