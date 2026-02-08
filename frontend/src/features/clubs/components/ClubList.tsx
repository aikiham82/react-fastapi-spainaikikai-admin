import { useState, useMemo } from 'react';
import { useClubContext } from '../hooks/useClubContext';
import { useDebounce } from '@/core/hooks/useDebounce';
import type { Club } from '../data/schemas/club.schema';
import { Building2, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/core/hooks/usePermissions';
import { ClubForm } from './ClubForm';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

export const ClubList = () => {
  const { clubs, isLoading, error, deleteClub } = useClubContext();
  const { canAccess } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClubForEdit, setSelectedClubForEdit] = useState<Club | null>(null);
  const [clubToDelete, setClubToDelete] = useState<Club | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error al cargar los clubs</p>
        <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      </div>
    );
  }

  if (clubs.length === 0 && !searchTerm) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clubs</h3>
        <p className="text-gray-600 mb-4">No hay clubs registrados</p>
        {canAccess({ resource: 'clubs', action: 'create' }) && (
          <Button onClick={() => { setSelectedClubForEdit(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Club
          </Button>
        )}
        <ClubForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          club={selectedClubForEdit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar clubs por nombre o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {canAccess({ resource: 'clubs', action: 'create' }) && (
          <Button onClick={() => { setSelectedClubForEdit(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Club
          </Button>
        )}
      </div>

      {filteredClubs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No se encontraron resultados para tu búsqueda</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClubs.map((club) => (
          <Card key={club.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    <button
                      type="button"
                      className="text-left hover:text-primary hover:underline transition-colors cursor-pointer"
                      onClick={() => { setSelectedClubForEdit(club); setIsFormOpen(true); }}
                    >
                      {club.name}
                    </button>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4" />
                    {club.city}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {canAccess({ resource: 'clubs', action: 'delete' }) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setClubToDelete(club)}
                      aria-label="Eliminar club"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600 truncate">{club.address}</p>
                <p className="text-gray-600">{club.postal_code}, {club.city}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      <ClubForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        club={selectedClubForEdit}
      />

      <ConfirmDeleteDialog
        open={!!clubToDelete}
        onOpenChange={(open) => !open && setClubToDelete(null)}
        description={`Se eliminará permanentemente el club "${clubToDelete?.name}". Esta acción no se puede deshacer.`}
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
