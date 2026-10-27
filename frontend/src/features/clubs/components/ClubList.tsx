import { foldForSearch } from '@/core/utils/search';
import { useState, useMemo } from 'react';
import { useClubContext } from '../hooks/useClubContext';
import { useDebounce } from '@/core/hooks/useDebounce';
import type { Club } from '../data/schemas/club.schema';
import { Ban, MapPin, Pencil, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, ListToolbar, ListLoading, ListError } from '@/components/ui/list-controls';
import { Avatar } from '@/components/ui/graphic';
import { StatusBadge } from '@/components/ui/status-badge';
import { usePermissions } from '@/core/hooks/usePermissions';
import { ClubForm } from './ClubForm';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { DeregisterClubButton } from './DeregisterClubButton';

const clubLocation = (club: Club): string => {
  const cityLine = [club.postal_code, club.city].filter(Boolean).join(' ');
  return [club.address, cityLine].filter(Boolean).join(' · ');
};

const memberCountLabel = (count: number): string => `${count} ${count === 1 ? 'socio' : 'socios'}`;

export const ClubList = () => {
  const { clubs, isLoading, error, deleteClub } = useClubContext();
  const { canAccess, isAssociationAdmin } = usePermissions();
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
                        {club.member_count !== undefined && (
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="size-[18px] shrink-0" aria-hidden="true" />
                            <span>{memberCountLabel(club.member_count)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex w-full gap-2 pl-14 sm:w-auto sm:shrink-0 sm:pl-0">
                      {isAssociationAdmin() && !isDeregistered && (
                        <DeregisterClubButton
                          clubId={club.id}
                          clubName={club.name}
                          label="Dar de baja"
                          ariaLabel={`Dar de baja ${club.name}`}
                          className="flex-1 text-destructive hover:text-destructive pointer-coarse:h-11 sm:flex-none"
                        />
                      )}
                      <Button
                        variant="outline"
                        aria-label={`Editar ${club.name}`}
                        className="flex-1 pointer-coarse:h-11 sm:flex-none"
                        onClick={() => openEdit(club)}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Editar
                      </Button>
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
