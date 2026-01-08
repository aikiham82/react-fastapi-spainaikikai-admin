import { useState } from 'react';
import { useSeminarContext } from '../hooks/useSeminarContext';
import { Calendar, Plus, Search, Edit, Trash2, Eye, Users, MapPin, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/core/hooks/usePermissions';
import type { Seminar } from '../data/schemas/seminar.schema';

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Próximo',
  ongoing: 'En curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

export const SeminarList = () => {
  const { seminars, isLoading, error, filters, setFilters, total, limit, offset, deleteSeminar, selectSeminar, setPagination } = useSeminarContext();
  const { canAccess } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, title: value || undefined, offset: 0 });
  };

  const handleFilterStatus = (value: string) => {
    setStatusFilter(value);
    setFilters({ ...filters, status: value || undefined, offset: 0 });
  };

  const isUpcoming = (date: string) => {
    const seminarDate = new Date(date);
    const today = new Date();
    return seminarDate >= today;
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

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
        <p className="text-red-500">Error al cargar los seminarios</p>
        <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      </div>
    );
  }

  if (seminars.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay seminarios</h3>
        <p className="text-gray-600 mb-4">
          {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'No hay seminarios registrados'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar seminarios por título..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={handleFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="upcoming">Próximo</SelectItem>
            <SelectItem value="ongoing">En curso</SelectItem>
            <SelectItem value="completed">Finalizado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        {canAccess({ resource: 'seminars', action: 'create' }) && (
          <Button onClick={() => selectSeminar(null)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Seminario
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {seminars.map((seminar) => (
          <div key={seminar.id} className="border rounded-lg hover:shadow-lg transition-shadow bg-white">
            {seminar.image_url && (
              <div className="w-full h-48 bg-gray-100 overflow-hidden">
                <img
                  src={seminar.image_url}
                  alt={seminar.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 flex-1">
                    {seminar.title}
                  </h3>
                  <Badge
                    variant={
                      seminar.status === 'upcoming' ? 'default' :
                      seminar.status === 'ongoing' ? 'secondary' :
                      seminar.status === 'completed' ? 'outline' : 'destructive'
                    }
                  >
                    {STATUS_LABELS[seminar.status] || seminar.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {seminar.description}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(`${seminar.date}T${seminar.time}`).toLocaleString('es-ES', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{seminar.location}</span>
                </div>
                {seminar.instructor && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{seminar.instructor}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-600">
                      {seminar.current_participants}
                      {seminar.max_participants && `/${seminar.max_participants}`}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {seminar.price.toFixed(2)}€
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 pt-0">
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalles
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{seminar.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {seminar.image_url && (
                        <div className="w-full h-64 bg-gray-100 overflow-hidden rounded-lg">
                          <img
                            src={seminar.image_url}
                            alt={seminar.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">Descripción</p>
                        <p className="text-sm text-gray-600 mt-1">{seminar.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Fecha</p>
                          <p className="text-sm text-gray-600">
                            {new Date(`${seminar.date}T${seminar.time}`).toLocaleString('es-ES', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Ubicación</p>
                          <p className="text-sm text-gray-600">{seminar.location}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Participantes</p>
                          <p className="text-sm text-gray-600">
                            {seminar.current_participants}
                            {seminar.max_participants && `/${seminar.max_participants}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Precio</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {seminar.price.toFixed(2)}€
                          </p>
                        </div>
                      </div>
                      {seminar.instructor && (
                        <div>
                          <p className="text-sm font-medium text-gray-900">Instructor</p>
                          <p className="text-sm text-gray-600">{seminar.instructor}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">Estado</p>
                        <Badge
                          variant={
                            seminar.status === 'upcoming' ? 'default' :
                            seminar.status === 'ongoing' ? 'secondary' :
                            seminar.status === 'completed' ? 'outline' : 'destructive'
                          }
                        >
                          {STATUS_LABELS[seminar.status] || seminar.status}
                        </Badge>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {canAccess({ resource: 'seminars', action: 'update' }) && (
                  <Button variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                )}

                {canAccess({ resource: 'seminars', action: 'delete' }) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (window.confirm(`¿Estás seguro de eliminar el seminario "${seminar.title}"?`)) {
                        deleteSeminar(seminar.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} seminarios
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(Math.max(0, offset - limit), limit)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(offset + limit, limit)}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
