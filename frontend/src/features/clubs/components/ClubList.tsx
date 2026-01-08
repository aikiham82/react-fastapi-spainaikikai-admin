import { useState } from 'react';
import { useClubContext } from '../hooks/useClubContext';
import type { Club } from '../data/schemas/club.schema';
import { Building2, Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePermissions } from '@/core/hooks/usePermissions';
import { ClubForm } from './ClubForm';

export const ClubList = () => {
  const { clubs, isLoading, error, filters, setFilters, deleteClub, selectClub } = useClubContext();
  const { canAccess } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClubForEdit, setSelectedClubForEdit] = useState<Club | null>(null);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, search: value || undefined });
  };

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

  if (clubs.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clubs</h3>
        <p className="text-gray-600 mb-4">
          {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'No hay clubs registrados'}
        </p>
        {canAccess({ resource: 'clubs', action: 'create' }) && (
          <Button onClick={() => { setSelectedClubForEdit(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Club
          </Button>
        )}
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
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        {canAccess({ resource: 'clubs', action: 'create' }) && (
          <Button onClick={() => { setSelectedClubForEdit(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Club
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map((club) => (
          <Card key={club.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{club.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4" />
                    {club.city}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => selectClub(club)} aria-label="Ver detalles del club">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{club.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Dirección</p>
                          <p className="text-sm text-gray-600">{club.address}</p>
                          <p className="text-sm text-gray-600">{club.postal_code} {club.city}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Teléfono</p>
                            <p className="text-sm text-gray-600">{club.phone}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Email</p>
                            <p className="text-sm text-gray-600">{club.email}</p>
                          </div>
                        </div>
                        {club.website && (
                          <div>
                            <p className="text-sm font-medium text-gray-900">Sitio Web</p>
                            <a href={club.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                              {club.website}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary">
                            {club.member_count || 0} miembros
                          </Badge>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {canAccess({ resource: 'clubs', action: 'update' }) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setSelectedClubForEdit(club); setIsFormOpen(true); }}
                      aria-label="Editar club"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}

                  {canAccess({ resource: 'clubs', action: 'delete' }) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm(`¿Estás seguro de eliminar el club "${club.name}"?`)) {
                          deleteClub(club.id);
                        }
                      }}
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

      <ClubForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        club={selectedClubForEdit}
      />
    </div>
  );
};
