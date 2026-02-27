import { useState, useEffect, useRef } from 'react';
import { useSeminarContext } from '../hooks/useSeminarContext';
import type { Seminar } from '../data/schemas/seminar.schema';
import { Calendar, Plus, Search, Trash2, Eye, Pencil, Users, MapPin, Clock, User, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/core/hooks/usePermissions';
import { SeminarForm } from './SeminarForm';
import { OfficialBadge } from './OfficialBadge';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SolicitudOficialidadModal } from './SolicitudOficialidadModal';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { apiClient } from '@/core/data/apiClient';

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Próximo',
  ongoing: 'En curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

const formatDateTime = (dateString: string | undefined) => {
  if (!dateString) return 'Fecha no disponible';
  try {
    return new Date(dateString).toLocaleString('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return 'Fecha inválida';
  }
};

export const SeminarList = () => {
  const { seminars, isLoading, error, filters, setFilters, total, limit, offset, deleteSeminar, setPagination } = useSeminarContext();
  const { canAccess } = usePermissions();
  const { clubId, userRole } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSeminarForEdit, setSelectedSeminarForEdit] = useState<Seminar | null>(null);
  const [seminarToDelete, setSeminarToDelete] = useState<Seminar | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [oficialidadModalSeminar, setOficialidadModalSeminar] = useState<Seminar | null>(null);
  const [oficialidadPrice, setOficialidadPrice] = useState<number | null>(null);
  const [pendingOficialidadId, setPendingOficialidadId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartRef = useRef<number>(0);

  // Fetch oficialidad price when modal opens
  useEffect(() => {
    if (oficialidadModalSeminar) {
      setOficialidadPrice(null);
      apiClient.get<{ key: string; price: number }>('/api/v1/price-configurations/seminar-price')
        .then((config) => setOficialidadPrice(config.price))
        .catch(() => setOficialidadPrice(null));
    }
  }, [oficialidadModalSeminar]);

  // Post-payment return handling: detect query params from Redsys redirect
  useEffect(() => {
    const oficialidadResult = searchParams.get('oficialidad');
    const seminarId = searchParams.get('seminar_id');

    if (!oficialidadResult || !seminarId) return;

    // Clear query params to avoid re-triggering
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('oficialidad');
    newParams.delete('seminar_id');
    // Also remove Redsys-appended params
    newParams.delete('Ds_SignatureVersion');
    newParams.delete('Ds_MerchantParameters');
    newParams.delete('Ds_Signature');
    setSearchParams(newParams, { replace: true });

    if (oficialidadResult === 'cancelled') {
      toast.info('Pago cancelado');
      return;
    }

    if (oficialidadResult === 'ok') {
      // Start polling for oficialidad confirmation
      setPendingOficialidadId(seminarId);
      pollingStartRef.current = Date.now();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Polling: check if seminar became official after Redsys return
  useEffect(() => {
    if (!pendingOficialidadId) return;

    pollingRef.current = setInterval(async () => {
      try {
        const seminar = await apiClient.get<Seminar>(
          `/api/v1/seminars/${pendingOficialidadId}`
        );
        if (seminar.is_official) {
          // Success! Stop polling and show toast
          setPendingOficialidadId(null);
          toast.success('Seminario oficial!');
          // Trigger refetch by updating filters reference
          setFilters({ ...filters });
        }
      } catch {
        // Ignore polling errors
      }

      // Timeout after 30 seconds
      if (Date.now() - pollingStartRef.current > 30000) {
        setPendingOficialidadId(null);
        toast.info(
          'No pudimos confirmar el pago aún. El seminario se actualizará automáticamente cuando se procese.'
        );
      }
    }, 2000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pendingOficialidadId, filters, setFilters]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilterStatus = (value: string) => {
    setStatusFilter(value);
    setFilters({ ...filters, status: value === 'all' ? undefined : value as any, offset: 0 });
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

  const hasActiveFilters = !!searchTerm || (!!statusFilter && statusFilter !== 'all');

  if (seminars.length === 0 && !hasActiveFilters) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay seminarios</h3>
        <p className="text-gray-600 mb-4">No hay seminarios registrados</p>
        {canAccess({ resource: 'seminars', action: 'create' }) && (
          <Button onClick={() => { setSelectedSeminarForEdit(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Seminario
          </Button>
        )}
        <SeminarForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          seminar={selectedSeminarForEdit}
        />
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
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="upcoming">Próximo</SelectItem>
            <SelectItem value="ongoing">En curso</SelectItem>
            <SelectItem value="completed">Finalizado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        {canAccess({ resource: 'seminars', action: 'create' }) && (
          <Button onClick={() => { setSelectedSeminarForEdit(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Seminario
          </Button>
        )}
      </div>

      {seminars.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No se encontraron resultados para tu búsqueda</p>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {seminars.map((seminar) => (
          <Dialog key={seminar.id}>
          <div className="border rounded-lg hover:shadow-lg transition-shadow bg-white overflow-hidden">
            {/* Cover image banner — 16:9, clickable to open detail */}
            <DialogTrigger asChild>
              <div className="aspect-video bg-muted relative cursor-pointer">
                {seminar.is_official && <OfficialBadge />}
                {seminar.cover_image_url ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}${seminar.cover_image_url}`}
                    alt={seminar.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <Calendar className="w-12 h-12 text-slate-400" />
                  </div>
                )}
              </div>
            </DialogTrigger>
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold flex-1">
                    <button
                      type="button"
                      className="text-left text-gray-900 hover:text-primary hover:underline transition-colors cursor-pointer"
                      onClick={() => { setSelectedSeminarForEdit(seminar); setIsFormOpen(true); }}
                    >
                      {seminar.title}
                    </button>
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
                  <span>{formatDateTime(seminar.start_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{seminar.venue}, {seminar.city}</span>
                </div>
                {seminar.instructor_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{seminar.instructor_name}</span>
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
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">
                    {seminar.price.toFixed(2)} €
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 pt-0">
              <div className="flex gap-2">
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 cursor-pointer" aria-label="Ver detalles del seminario">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalles
                    </Button>
                  </DialogTrigger>
                  {!seminar.is_official
                    && seminar.status !== 'cancelled'
                    && userRole === 'club_admin'
                    && seminar.club_id === clubId
                    && (
                    pendingOficialidadId === seminar.id ? (
                      <Button variant="outline" className="flex-1" disabled aria-live="polite">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Procesando...
                      </Button>
                    ) : (
                      <Button className="flex-1 cursor-pointer" onClick={() => setOficialidadModalSeminar(seminar)}>
                        <Award className="w-4 h-4 mr-2" />
                        Oficialidad
                      </Button>
                    )
                  )}
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{seminar.title}</DialogTitle>
                    </DialogHeader>
                    {/* Cover image banner in detail dialog */}
                    {seminar.cover_image_url && (
                      <div className="aspect-video w-full overflow-hidden rounded-md bg-muted -mt-2 mb-2 relative">
                        {seminar.is_official && <OfficialBadge />}
                        <img
                          src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}${seminar.cover_image_url}`}
                          alt={seminar.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {!seminar.cover_image_url && seminar.is_official && (
                      <div className="relative h-10 -mt-2 mb-2">
                        <OfficialBadge />
                      </div>
                    )}
                    <div className="space-y-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Descripción</p>
                        <p className="text-sm text-gray-600 mt-1">{seminar.description || 'Sin descripción'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Fecha Inicio</p>
                          <p className="text-sm text-gray-600">{formatDateTime(seminar.start_date)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Fecha Fin</p>
                          <p className="text-sm text-gray-600">{formatDateTime(seminar.end_date)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Lugar</p>
                          <p className="text-sm text-gray-600">{seminar.venue}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Dirección</p>
                          <p className="text-sm text-gray-600">{seminar.address}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Ciudad</p>
                          <p className="text-sm text-gray-600">{seminar.city}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Provincia</p>
                          <p className="text-sm text-gray-600">{seminar.province}</p>
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
                          <p className="text-2xl font-bold text-gray-900 tabular-nums">
                            {seminar.price.toFixed(2)} €
                          </p>
                        </div>
                      </div>
                      {seminar.instructor_name && (
                        <div>
                          <p className="text-sm font-medium text-gray-900">Instructor</p>
                          <p className="text-sm text-gray-600">{seminar.instructor_name}</p>
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
                      {seminar.is_official && (
                        <div>
                          <p className="text-sm font-medium text-gray-900">Oficialidad</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Award className="w-4 h-4 text-amber-500" />
                            <span className="text-sm text-amber-700 font-medium">
                              Seminario avalado por Spain Aikikai
                            </span>
                          </div>
                        </div>
                      )}
                      {/* Solicitar Oficialidad button — visible to club admin for their non-official seminars */}
                      {!seminar.is_official
                        && seminar.status !== 'cancelled'
                        && userRole === 'club_admin'
                        && seminar.club_id === clubId
                        && (
                        <div className="pt-2">
                          {pendingOficialidadId === seminar.id ? (
                            <Button
                              variant="outline"
                              className="w-full"
                              disabled
                              aria-live="polite"
                            >
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Procesando pago...
                            </Button>
                          ) : (
                            <Button
                              className="w-full cursor-pointer"
                              onClick={() => setOficialidadModalSeminar(seminar)}
                            >
                              <Award className="w-4 h-4 mr-2" />
                              Solicitar Oficialidad
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </DialogContent>

                {canAccess({ resource: 'seminars', action: 'update' }) && (
                  <Button
                    variant="outline"
                    onClick={() => { setSelectedSeminarForEdit(seminar); setIsFormOpen(true); }}
                    aria-label="Editar seminario"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}

                {canAccess({ resource: 'seminars', action: 'delete' }) && (
                  <Button
                    variant="outline"
                    onClick={() => setSeminarToDelete(seminar)}
                    aria-label="Eliminar seminario"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          </Dialog>
        ))}
      </div>
      </>
      )}

      {total > limit && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
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

      <SeminarForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        seminar={selectedSeminarForEdit}
      />

      <ConfirmDeleteDialog
        open={!!seminarToDelete}
        onOpenChange={(open) => !open && setSeminarToDelete(null)}
        description={`Se eliminará permanentemente el seminario "${seminarToDelete?.title}". Esta acción no se puede deshacer.`}
        onConfirm={() => {
          if (seminarToDelete) {
            deleteSeminar(seminarToDelete.id);
            setSeminarToDelete(null);
          }
        }}
      />

      <SolicitudOficialidadModal
        open={!!oficialidadModalSeminar}
        onOpenChange={(open) => !open && setOficialidadModalSeminar(null)}
        seminarId={oficialidadModalSeminar?.id || ''}
        seminarTitle={oficialidadModalSeminar?.title || ''}
        price={oficialidadPrice}
      />
    </div>
  );
};
