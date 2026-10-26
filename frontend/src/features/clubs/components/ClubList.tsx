import { useState, useMemo } from 'react';
import { useClubContext } from '../hooks/useClubContext';
import { useDebounce } from '@/core/hooks/useDebounce';
import type { Club } from '../data/schemas/club.schema';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, ListToolbar } from '@/components/ui/list-controls';
import { usePermissions } from '@/core/hooks/usePermissions';
import { ClubForm } from './ClubForm';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

const clubLocation = (club: Club): string => {
  const cityLine = [club.postal_code, club.city].filter(Boolean).join(' ');
  return [club.address, cityLine].filter(Boolean).join(' · ');
};

const memberCountLabel = (count: number): string => `${count} ${count === 1 ? 'socio' : 'socios'}`;

export const ClubList = () => {
  const { clubs, isLoading, error, deleteClub } = useClubContext();
  const { canAccess } = usePermissions();
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
    const term = debouncedSearch.toLowerCase();
    return sorted.filter(
      (club) =>
        club.name.toLowerCase().includes(term) ||
        club.city?.toLowerCase().includes(term)
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
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="Cargando clubs">
        <div className="size-8 animate-spin rounded-full border-b-2 border-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12" role="alert">
        <p className="font-medium text-danger">No se han podido cargar los clubs</p>
        <p className="mt-1 text-sm text-muted-foreground">Inténtalo de nuevo en unos minutos.</p>
      </div>
    );
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
                      {location && <p className="truncate text-sm text-muted-foreground">{location}</p>}
                      {club.member_count !== undefined && (
                        <p className="text-sm text-muted-foreground">{memberCountLabel(club.member_count)}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="shrink-0"
                      aria-label={`Editar ${club.name}`}
                      onClick={() => openEdit(club)}
                    >
                      Editar
                    </Button>
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
