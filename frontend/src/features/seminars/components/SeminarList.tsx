import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useSeminarContext } from '../hooks/useSeminarContext';
import type { Seminar } from '../data/schemas/seminar.schema';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, ListToolbar } from '@/components/ui/list-controls';
import { usePermissions } from '@/core/hooks/usePermissions';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { apiClient } from '@/core/data/apiClient';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { SeminarForm } from './SeminarForm';
import { SeminarRow } from './SeminarRow';
import { SeminarDetailDialog } from './SeminarDetailDialog';
import { SolicitudOficialidadModal } from './SolicitudOficialidadModal';
import { canRequestOficialidad, splitSeminars } from '../utils/seminarDates';

type SeminarStatus = NonNullable<ReturnType<typeof useSeminarContext>['filters']['status']>;

export const SeminarList = () => {
  const { seminars, isLoading, error, filters, setFilters, total, limit, offset, deleteSeminar, setPagination } = useSeminarContext();
  const { canAccess } = usePermissions();
  const { clubId, userRole } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSeminarForEdit, setSelectedSeminarForEdit] = useState<Seminar | null>(null);
  const [seminarToDelete, setSeminarToDelete] = useState<Seminar | null>(null);
  const [detailSeminar, setDetailSeminar] = useState<Seminar | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [oficialidadModalSeminar, setOficialidadModalSeminar] = useState<Seminar | null>(null);
  const [pendingOficialidadId, setPendingOficialidadId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartRef = useRef<number>(0);

  useEffect(() => {
    const oficialidadResult = searchParams.get('oficialidad');
    const seminarId = searchParams.get('seminar_id');

    if (!oficialidadResult || !seminarId) return;

    const newParams = new URLSearchParams(searchParams);
    newParams.delete('oficialidad');
    newParams.delete('seminar_id');
    newParams.delete('Ds_SignatureVersion');
    newParams.delete('Ds_MerchantParameters');
    newParams.delete('Ds_Signature');
    setSearchParams(newParams, { replace: true });

    if (oficialidadResult === 'cancelled') {
      toast.info('Pago cancelado');
      return;
    }

    if (oficialidadResult === 'ok') {
      setPendingOficialidadId(seminarId);
      pollingStartRef.current = Date.now();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingOficialidadId) return;

    pollingRef.current = setInterval(async () => {
      try {
        const seminar = await apiClient.get<Seminar>(`/api/v1/seminars/${pendingOficialidadId}`);
        if (seminar.is_official) {
          setPendingOficialidadId(null);
          toast.success('El seminario ya es oficial');
          setFilters({ ...filters });
        }
      } catch {
        // Polling errors are retried on the next tick
      }

      if (Date.now() - pollingStartRef.current > 30000) {
        setPendingOficialidadId(null);
        toast.info('No pudimos confirmar el pago aún. El seminario se actualizará automáticamente cuando se procese.');
      }
    }, 2000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pendingOficialidadId, filters, setFilters]);

  const handleFilterStatus = (value: string) => {
    setStatusFilter(value);
    setFilters({ ...filters, status: value === 'all' ? undefined : (value as SeminarStatus), offset: 0 });
  };

  const clearFilters = () => {
    setSearchTerm('');
    handleFilterStatus('all');
  };

  const visible = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const matching = term
      ? seminars.filter((s) =>
          [s.title, s.instructor_name, s.city, s.venue].some((value) => value?.toLowerCase().includes(term))
        )
      : seminars;
    return splitSeminars(matching);
  }, [seminars, searchTerm]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const canCreate = canAccess({ resource: 'seminars', action: 'create' });
  const canUpdate = canAccess({ resource: 'seminars', action: 'update' });
  const canDelete = canAccess({ resource: 'seminars', action: 'delete' });
  const activeFilters = statusFilter !== 'all' ? 1 : 0;
  const hasActiveFilters = !!searchTerm || activeFilters > 0;

  const openCreate = () => {
    setSelectedSeminarForEdit(null);
    setIsFormOpen(true);
  };

  const mayRequestOficialidad = (seminar: Seminar) =>
    userRole === 'club_admin' && seminar.club_id === clubId && canRequestOficialidad(seminar);

  const renderRow = (seminar: Seminar) => {
    const actions = [
      ...(canUpdate
        ? [{ label: 'Editar', onSelect: () => { setSelectedSeminarForEdit(seminar); setIsFormOpen(true); } }]
        : []),
      ...(canDelete ? [{ label: 'Eliminar', destructive: true, onSelect: () => setSeminarToDelete(seminar) }] : []),
    ];
    return (
      <SeminarRow
        key={seminar.id}
        seminar={seminar}
        canRequestOficialidad={mayRequestOficialidad(seminar)}
        isProcessing={pendingOficialidadId === seminar.id}
        actions={actions}
        onOpen={() => setDetailSeminar(seminar)}
        onRequestOficialidad={() => setOficialidadModalSeminar(seminar)}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="Cargando seminarios">
        <div className="size-8 animate-spin rounded-full border-b-2 border-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState title="No se pudieron cargar los seminarios" description="Vuelve a intentarlo en unos minutos." />
    );
  }

  const newButton = canCreate ? (
    <Button onClick={openCreate}>
      <Plus className="size-4" />
      Nuevo seminario
    </Button>
  ) : undefined;

  const isEmpty = visible.upcoming.length === 0 && visible.past.length === 0;

  return (
    <div className="space-y-6">
      {(seminars.length > 0 || hasActiveFilters) && (
        <ListToolbar
          search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Buscar seminario' }}
          activeFilters={activeFilters}
          onClearFilters={clearFilters}
          filters={
            <div className="space-y-2">
              <Label htmlFor="seminar-status-filter">Estado</Label>
              <Select value={statusFilter} onValueChange={handleFilterStatus}>
                <SelectTrigger id="seminar-status-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="upcoming">Próximo</SelectItem>
                  <SelectItem value="ongoing">En curso</SelectItem>
                  <SelectItem value="completed">Finalizado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          action={newButton}
        />
      )}

      {isEmpty ? (
        hasActiveFilters ? (
          <EmptyState title="No hay seminarios con esos filtros" onClear={clearFilters} />
        ) : (
          <EmptyState
            title="Todavía no hay seminarios"
            description="Cuando crees uno aparecerá aquí."
            action={newButton}
          />
        )
      ) : (
        <div className="space-y-6">
          {visible.upcoming.length > 0 && (
            <section aria-label="Próximos seminarios">
              <h2 className="pb-1 text-sm font-medium text-muted-foreground">Próximos ({visible.upcoming.length})</h2>
              <ul className="border-t border-border">{visible.upcoming.map(renderRow)}</ul>
            </section>
          )}

          {visible.past.length > 0 && (
            <details className="group" open={visible.upcoming.length === 0 && hasActiveFilters}>
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-muted-foreground">
                Pasados y cancelados ({visible.past.length})
              </summary>
              <ul className="border-t border-border">{visible.past.map(renderRow)}</ul>
            </details>
          )}
        </div>
      )}

      {total > limit && limit > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} seminarios
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPagination(Math.max(0, offset - limit), limit)} disabled={currentPage === 1}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPagination(offset + limit, limit)} disabled={currentPage === totalPages}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <SeminarDetailDialog
        seminar={detailSeminar}
        onClose={() => setDetailSeminar(null)}
        canRequestOficialidad={!!detailSeminar && mayRequestOficialidad(detailSeminar)}
        isProcessing={!!detailSeminar && pendingOficialidadId === detailSeminar.id}
        onRequestOficialidad={(seminar) => {
          setDetailSeminar(null);
          setOficialidadModalSeminar(seminar);
        }}
      />

      <SeminarForm open={isFormOpen} onOpenChange={setIsFormOpen} seminar={selectedSeminarForEdit} />

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
      />
    </div>
  );
};
