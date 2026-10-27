import { useState } from 'react';
import { usePriceConfigurationContext } from '../hooks/usePriceConfigurationContext';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, RowActions, ListLoading, ListError } from '@/components/ui/list-controls';
import { StatusBadge } from '@/components/ui/status-badge';
import { usePermissions } from '@/core/hooks/usePermissions';
import { PriceConfigurationForm } from './PriceConfigurationForm';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import type { PriceConfiguration } from '../data/schemas/price-configuration.schema';
import { getPriceKeyDescription } from '../data/schemas/price-configuration.schema';
import { formatCurrency } from '@/core/utils/format';
import { IconTile } from '@/components/ui/graphic';
import { priceIconOf } from '../utils/price-icon';

export const PriceConfigurationList = () => {
  const { priceConfigurations, isLoading, error, deletePriceConfiguration, isDeleting } = usePriceConfigurationContext();
  const { canAccess } = usePermissions();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<PriceConfiguration | null>(null);
  const [configToDelete, setConfigToDelete] = useState<PriceConfiguration | null>(null);

  const canCreate = canAccess({ resource: 'price_configurations', action: 'create' });
  const canDelete = canAccess({ resource: 'price_configurations', action: 'delete' });
  const canUpdate = canAccess({ resource: 'price_configurations', action: 'update' });

  const handleEdit = (config: PriceConfiguration) => {
    setSelectedConfig(config);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedConfig(null);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return <ListLoading />;
  }

  if (error) {
    return <ListError title="Error al cargar los precios" description={error.message} />;
  }

  const addButton = canCreate && (
    <Button onClick={handleCreate}>
      <Plus className="size-4" />
      Nuevo precio
    </Button>
  );

  const status = (config: PriceConfiguration) =>
    config.is_active ? null : <StatusBadge tone="neutral">Inactivo</StatusBadge>;

  const actions = (config: PriceConfiguration) => (
    <div className="flex items-center justify-end gap-1">
      {canUpdate && (
        <Button variant="outline" className="h-11" onClick={() => handleEdit(config)}>
          Editar
        </Button>
      )}
      {canDelete && (
        <RowActions
          label={`Más acciones para ${getPriceKeyDescription(config.key, config.category)}`}
          actions={[{ label: 'Eliminar', destructive: true, onSelect: () => !isDeleting && setConfigToDelete(config) }]}
        />
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {priceConfigurations.length === 0 ? (
        <EmptyState title="Todavía no hay precios. Sin precios, los clubs no pueden pagar." action={addButton || undefined} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {priceConfigurations.length} {priceConfigurations.length === 1 ? 'precio' : 'precios'}
            </p>
            {addButton}
          </div>

          <ul className="flex flex-col gap-3">
            {priceConfigurations.map((config) => (
              <li
                key={config.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] bg-card p-4 shadow-card"
              >
                <IconTile icon={priceIconOf(config.key, config.category)} tone={config.is_active ? 'brand' : 'neutral'} />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <p className="break-words text-[15px] font-semibold text-foreground">
                    {getPriceKeyDescription(config.key, config.category)}
                  </p>
                  {status(config)}
                </div>
                <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {formatCurrency(config.price)}
                </span>
                <div className="flex w-full justify-end sm:w-auto">{actions(config)}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      <PriceConfigurationForm open={isFormOpen} onOpenChange={setIsFormOpen} priceConfiguration={selectedConfig} />

      <ConfirmDeleteDialog
        open={!!configToDelete}
        onOpenChange={(open) => !open && setConfigToDelete(null)}
        description={`Se eliminará permanentemente el precio "${configToDelete ? getPriceKeyDescription(configToDelete.key, configToDelete.category) : ''}". Esta acción no se puede deshacer.`}
        onConfirm={() => {
          if (configToDelete) {
            deletePriceConfiguration(configToDelete.id);
            setConfigToDelete(null);
          }
        }}
      />
    </div>
  );
};
