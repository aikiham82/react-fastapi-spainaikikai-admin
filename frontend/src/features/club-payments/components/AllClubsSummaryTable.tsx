import { foldForSearch } from '@/core/utils/search';
import { useState } from 'react';
import { useClubPaymentsContext } from '../hooks/useClubPaymentsContext';
import { ListToolbar, EmptyState, ListLoading, ListError } from '@/components/ui/list-controls';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { formatCurrency } from '@/core/utils/format';
import { Avatar, ProgressBar } from '@/components/ui/graphic';

const getPaymentProgress = (paid: number, total: number) => {
  if (total === 0) return 0;
  return Math.round((paid / total) * 100);
};

const progressTone = (percent: number): StatusTone => {
  if (percent >= 80) return 'ok';
  if (percent >= 50) return 'warn';
  return 'bad';
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

      <ul className="grid gap-3 md:grid-cols-2 lg:hidden">
        {filtered.map((club) => {
          const progress = getPaymentProgress(club.members_with_license, club.total_members);
          return (
            <li key={club.club_id}>
              <div
                role="button"
                tabIndex={0}
                aria-label={`Ver detalle de ${club.club_name}`}
                className="flex h-full min-h-11 cursor-pointer flex-col gap-3 rounded-[18px] bg-card p-4 shadow-card"
                onClick={() => open(club.club_id)}
                onKeyDown={onKey(club.club_id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={club.club_name} size="md" />
                  <p className="min-w-0 flex-1 text-[15px] font-semibold text-foreground">{club.club_name}</p>
                  <StatusBadge tone={progressTone(progress)}>{progress}%</StatusBadge>
                </div>
                <div className="flex flex-col gap-1.5">
                  <ProgressBar
                    value={club.members_with_license}
                    max={club.total_members}
                    label="Licencias pagadas"
                    tone={progressTone(progress)}
                  />
                  <p className="text-sm text-muted-foreground">
                    <span className={num}>
                      {club.members_with_license} de {club.total_members}
                    </span>{' '}
                    con licencia · {club.members_with_insurance} con seguro
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusBadge tone={club.has_club_fee ? 'ok' : 'warn'}>
                    {club.has_club_fee ? 'Cuota pagada' : 'Cuota pendiente'}
                  </StatusBadge>
                  <span className={`text-sm font-semibold text-foreground ${num}`}>{formatCurrency(club.total_collected)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-hidden rounded-[18px] bg-card shadow-card lg:block">
      <table className="w-full [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:first-child]:pl-5 [&_th:last-child]:pr-5">
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
                <td className="px-3 py-3">
                  <span className="flex items-center gap-3 text-[15px] font-semibold text-foreground">
                    <Avatar name={club.club_name} />
                    {club.club_name}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge tone={club.has_club_fee ? 'ok' : 'warn'}>
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
                  <span className="flex items-center gap-2">
                    <span className="w-24 xl:w-28">
                      <ProgressBar
                        value={club.members_with_license}
                        max={club.total_members}
                        label={`Licencias pagadas de ${club.club_name}`}
                        tone={progressTone(progress)}
                      />
                    </span>
                    <span className={`text-sm font-semibold text-foreground ${num}`}>{progress}%</span>
                  </span>
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
    </div>
  );
};
