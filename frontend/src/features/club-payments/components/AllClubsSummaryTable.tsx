import { foldForSearch } from '@/core/utils/search';
import { useState } from 'react';
import { useClubPaymentsContext } from '../hooks/useClubPaymentsContext';
import { ListToolbar, EmptyState, ListLoading, ListError } from '@/components/ui/list-controls';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { formatCurrency } from '@/core/utils/format';

const getPaymentProgress = (paid: number, total: number) => {
  if (total === 0) return 0;
  return Math.round((paid / total) * 100);
};

const progressTone = (percent: number): StatusTone => {
  if (percent >= 80) return 'ok';
  if (percent >= 50) return 'warn';
  return 'neutral';
};

const th = 'px-3 py-3 text-left text-sm font-medium text-muted-foreground';
const num = 'tabular-nums';

export const AllClubsSummaryTable = () => {
  const { allClubsSummary, isLoadingAllClubs, allClubsError, selectClub } = useClubPaymentsContext();
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoadingAllClubs) {
    return <ListLoading />;
  }

  if (allClubsError) {
    return <ListError title="Error al cargar los datos de pagos" description={allClubsError.message} />;
  }

  const clubs = [...(allClubsSummary?.clubs ?? [])].sort((a, b) => a.club_name.localeCompare(b.club_name, 'es'));
  const filtered = clubs.filter((c) => foldForSearch(c.club_name).includes(foldForSearch(searchTerm)));

  if (clubs.length === 0) {
    return <EmptyState title="No hay clubs" description="No se encontraron clubs con datos de pagos" />;
  }

  const open = (clubId: string) => selectClub(clubId);
  const onKey = (clubId: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open(clubId);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-foreground">
        <span className="font-semibold">{clubs.length} clubs</span>
        <span className="text-muted-foreground">
          {' · '}
          {allClubsSummary?.grand_total_members ?? 0} miembros{' · '}
          Cobrado {formatCurrency(allClubsSummary?.grand_total_collected ?? 0)}
        </span>
      </p>

      <ListToolbar search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Buscar club...' }} />

      {filtered.length === 0 && <EmptyState title="No se encontró ningún club" />}

      <ul className="border-t border-border md:hidden">
        {filtered.map((club) => {
          const progress = getPaymentProgress(club.members_with_license, club.total_members);
          return (
            <li key={club.club_id} className="border-b border-border">
              <div
                role="button"
                tabIndex={0}
                aria-label={`Ver detalle de ${club.club_name}`}
                className="flex min-h-11 cursor-pointer flex-col gap-1 py-3"
                onClick={() => open(club.club_id)}
                onKeyDown={onKey(club.club_id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] font-semibold text-foreground">{club.club_name}</p>
                  <StatusBadge tone={progressTone(progress)}>{progress}%</StatusBadge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {club.total_members} miembros · {club.members_with_license} con licencia · {club.members_with_insurance} con seguro
                </p>
                <p className="text-sm text-muted-foreground">
                  Cuota {club.has_club_fee ? 'pagada' : 'pendiente'} · Cobrado{' '}
                  <span className={num}>{formatCurrency(club.total_collected)}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <table className="hidden w-full md:table">
        <thead>
          <tr className="border-b border-border">
            <th className={th}>Club</th>
            <th className={th}>Cuota del club</th>
            <th className={`${th} text-right`}>Miembros</th>
            <th className={`${th} text-right`}>Con licencia</th>
            <th className={`${th} text-right`}>Con seguro</th>
            <th className={`${th} text-right`}>Cobrado</th>
            <th className={th}>Progreso</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((club) => {
            const progress = getPaymentProgress(club.members_with_license, club.total_members);
            return (
              <tr
                key={club.club_id}
                tabIndex={0}
                aria-label={`Ver detalle de ${club.club_name}`}
                className="cursor-pointer border-b border-border hover:bg-muted/60"
                onClick={() => open(club.club_id)}
                onKeyDown={onKey(club.club_id)}
              >
                <td className="px-3 py-3 text-[15px] font-semibold text-foreground">{club.club_name}</td>
                <td className="px-3 py-3">
                  <StatusBadge tone={club.has_club_fee ? 'ok' : 'neutral'}>
                    {club.has_club_fee ? 'Pagada' : 'Pendiente'}
                  </StatusBadge>
                </td>
                <td className={`px-3 py-3 text-right text-foreground ${num}`}>{club.total_members}</td>
                <td className={`px-3 py-3 text-right text-foreground ${num}`}>
                  {club.members_with_license}/{club.total_members}
                </td>
                <td className={`px-3 py-3 text-right text-foreground ${num}`}>
                  {club.members_with_insurance}/{club.total_members}
                </td>
                <td className={`px-3 py-3 text-right font-medium text-foreground ${num}`}>
                  {formatCurrency(club.total_collected)}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge tone={progressTone(progress)}>{progress}%</StatusBadge>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="px-3 py-3 text-foreground">Total de todos los clubs</td>
            <td className={`px-3 py-3 text-foreground ${num}`}>
              {clubs.filter((c) => c.has_club_fee).length}/{clubs.length}
            </td>
            <td className={`px-3 py-3 text-right text-foreground ${num}`}>{allClubsSummary?.grand_total_members ?? 0}</td>
            <td className={`px-3 py-3 text-right text-foreground ${num}`}>
              {clubs.reduce((sum, c) => sum + c.members_with_license, 0)}
            </td>
            <td className={`px-3 py-3 text-right text-foreground ${num}`}>
              {clubs.reduce((sum, c) => sum + c.members_with_insurance, 0)}
            </td>
            <td className={`px-3 py-3 text-right text-foreground ${num}`}>
              {formatCurrency(allClubsSummary?.grand_total_collected ?? 0)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
