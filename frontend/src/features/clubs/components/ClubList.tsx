import { foldForSearch } from '@/core/utils/search';
import { useState, useMemo } from 'react';
import { useClubContext } from '../hooks/useClubContext';
import { useDebounce } from '@/core/hooks/useDebounce';
import type { Club } from '../data/schemas/club.schema';
import { Ban, MapPin, Pencil, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, ListToolbar, ListLoading, ListError, RowActions } from '@/components/ui/list-controls';
import { Avatar, ProgressBar } from '@/components/ui/graphic';
import { StatusBadge } from '@/components/ui/status-badge';
import { usePermissions } from '@/core/hooks/usePermissions';
import { insuranceSeasonYear } from '@/core/utils/defaultPaymentYear';
import { useAllClubsPaymentSummaryQuery } from '@/features/club-payments/hooks/queries/useClubPaymentsQueries';
import type { ClubSummaryItem } from '@/features/club-payments/data/schemas/club-payments.schema';
import { ClubForm } from './ClubForm';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { DeregisterClubDialog } from './DeregisterClubButton';
import { useDeregisterClubMutation } from '../hooks/mutations/useClubMutations';

const clubLocation = (club: Club): string => {
  const cityLine = [club.postal_code, club.city].filter(Boolean).join(' ');
  return [club.address, cityLine].filter(Boolean).join(' · ');
};

const memberCountLabel = (count: number): string => `${count} ${count === 1 ? 'socio' : 'socios'}`;

const SeasonPayment = ({ summary, year }: { summary: ClubSummaryItem; year: number }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Users className="size-[18px] shrink-0" aria-hidden="true" />
      {memberCountLabel(summary.total_members)}
    </p>
    {summary.total_members > 0 && (
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="w-16">
          <ProgressBar value={summary.members_with_license} max={summary.total_members} label="Licencias pagadas" />
        </span>
        {summary.members_with_license} de {summary.total_members} con licencia {year}
      </span>
    )}
    <StatusBadge tone={summary.has_club_fee ? 'ok' : 'warn'}>
      {summary.has_club_fee ? `Cuota ${year} pagada` : `Cuota ${year} pendiente`}
    </StatusBadge>
  </div>
);

export const ClubList = () => {
  const { clubs, isLoading, error, deleteClub } = useClubContext();
  const { canAccess, isAssociationAdmin } = usePermissions();
  const isSuperAdmin = isAssociationAdmin();
  const seasonYear = insuranceSeasonYear(new Date());
  const { data: seasonSummary } = useAllClubsPaymentSummaryQuery(seasonYear, isSuperAdmin);
  const summaryByClub = useMemo(
    () => new Map((seasonSummary?.clubs ?? []).map((summary) => [summary.club_id, summary])),
    [seasonSummary]
  );
  const [clubToDeregister, setClubToDeregister] = useState<Club | null>(null);
  const { mutate: deregister } = useDeregisterClubMutation();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClubForEdit, setSelectedClubForEdit] = useState<Club | null>(null);
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null);

  const canCreate = canAccess({ resource: 'clubs', action: 'create' });
  const canDelete = canAccess({ resource: 'clubs', action: 'delete' });

  const filteredClubs = useMemo(() => {
    const sorted = [...clubs].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (!debouncedSearch) return sorted;
    const term = foldForSearch(debouncedSearch);
    return sorted.filter(
      (club) =>
        foldForSearch(club.name).includes(term) ||
        (club.city ? foldForSearch(club.city).includes(term) : false)
    );
  }, [clubs, debouncedSearch]);

  const openCreate = () => {
    setSelectedClubForEdit(null);
    setIsFormOpen(true);
  };

  const openEdit = (club: Club) => {
    setSelectedClubForEdit(club);
    setIsFormOpen(true);
  };

  const requestDelete = (club: Club) => {
    setIsFormOpen(false);
    setClubToDelete(club);
  };

  const createButton = canCreate ? (
    <Button onClick={openCreate}>
      <Plus className="size-4" />
      Nuevo club
    </Button>
  ) : null;

  if (isLoading) {
    return <ListLoading label="Cargando clubs" />;
  }

  if (error) {
    return <ListError title="No se han podido cargar los clubs" description="Inténtalo de nuevo en unos minutos." />;
  }

  const deleteDescription = `Se eliminará permanentemente el club "${clubToDelete?.name}". Esta acción no se puede deshacer.`;

  return (
    <div className="space-y-4">
      {clubs.length === 0 && !searchTerm ? (
        <EmptyState title="Todavía no hay clubs" description="Crea el primer club para empezar." action={createButton} />
      ) : (
        <>
          <ListToolbar
            search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Buscar club' }}
            action={createButton}
          />

          {filteredClubs.length === 0 ? (
            <EmptyState
              title="No hay clubs que coincidan"
              description="Prueba con otro nombre o ciudad."
              onClear={() => setSearchTerm('')}
            />
          ) : (
            <ul className="space-y-3">
              {filteredClubs.map((club) => {
                const location = clubLocation(club);
                const isDeregistered = club.is_active === false;
                const summary = summaryByClub.get(club.id);
                return (
                  <li
                    key={club.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-card p-3 shadow-card sm:flex-nowrap sm:p-4"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={club.name} size="md" className="size-11" />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words text-[15px] font-semibold text-foreground">{club.name}</p>
                          {isDeregistered && <StatusBadge tone="neutral" icon={Ban}>De baja</StatusBadge>}
                        </div>
                        {location && (
                          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground" title={location}>
                            <MapPin className="size-[18px] shrink-0" aria-hidden="true" />
                            <span className="truncate">{location}</span>
                          </p>
                        )}
                        {summary && <SeasonPayment summary={summary} year={seasonYear} />}
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-2 pl-14 sm:w-auto sm:shrink-0 sm:pl-0">
                      <Button
                        variant="outline"
                        aria-label={`Editar ${club.name}`}
                        className="flex-1 sm:flex-none"
                        onClick={() => openEdit(club)}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Editar
                      </Button>
                      {isSuperAdmin && !isDeregistered && (
                        <RowActions
                          label={club.name}
                          actions={[{ label: 'Dar de baja', destructive: true, onSelect: () => setClubToDeregister(club) }]}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <ClubForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        club={selectedClubForEdit}
        onDelete={canDelete ? requestDelete : undefined}
      />

      {clubToDeregister && (
        <DeregisterClubDialog
          clubName={clubToDeregister.name}
          open
          onOpenChange={(open) => !open && setClubToDeregister(null)}
          onConfirm={() => deregister(clubToDeregister.id)}
        />
      )}

      <ConfirmDeleteDialog
        open={!!clubToDelete}
        onOpenChange={(open) => !open && setClubToDelete(null)}
        description={deleteDescription}
        onConfirm={() => {
          if (clubToDelete) {
            deleteClub(clubToDelete.id);
            setClubToDelete(null);
          }
        }}
      />
    </div>
  );
};
