import { foldForSearch } from '@/core/utils/search';
import { useState, useMemo } from 'react';
import { useClubContext } from '../hooks/useClubContext';
import { useDebounce } from '@/core/hooks/useDebounce';
import type { Club } from '../data/schemas/club.schema';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, ListToolbar, ListLoading, ListError } from '@/components/ui/list-controls';
import { usePermissions } from '@/core/hooks/usePermissions';
import { ClubForm } from './ClubForm';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Badge } from '@/components/ui/badge';
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
            <ul className="border-t border-border">
              {filteredClubs.map((club) => {
                const location = clubLocation(club);
                return (
                  <li
                    key={club.id}
                    className="flex items-center justify-between gap-3 border-b border-border py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-foreground">{club.name}</p>
                      {club.is_active === false && <Badge variant="secondary">De baja</Badge>}
                      {location && <p className="truncate text-sm text-muted-foreground">{location}</p>}
                      {club.member_count !== undefined && (
                        <p className="text-sm text-muted-foreground">{memberCountLabel(club.member_count)}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      {isAssociationAdmin() && club.is_active !== false && (
                        <DeregisterClubButton
                          clubId={club.id}
                          clubName={club.name}
                          label="Dar de baja"
                          ariaLabel={`Dar de baja ${club.name}`}
                        />
                      )}
                      <Button variant="outline" aria-label={`Editar ${club.name}`} onClick={() => openEdit(club)}>
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
