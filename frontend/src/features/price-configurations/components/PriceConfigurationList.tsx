import { useState } from 'react';
import { usePriceConfigurationContext } from '../hooks/usePriceConfigurationContext';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, RowActions } from '@/components/ui/list-controls';
import { StatusBadge } from '@/components/ui/status-badge';
import { usePermissions } from '@/core/hooks/usePermissions';
import { PriceConfigurationForm } from './PriceConfigurationForm';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import type { PriceConfiguration } from '../data/schemas/price-configuration.schema';
import { getPriceKeyDescription, formatCurrency } from '../data/schemas/price-configuration.schema';

const th = 'px-3 py-3 text-left text-sm font-medium text-muted-foreground';

export const PriceConfigurationList = () => {
  const { priceConfigurations, isLoading, error, deletePriceConfiguration, isDeleting } = usePriceConfigurationContext();
  const { canAccess } = usePermissions();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<PriceConfiguration | null>(null);
  const [configToDelete, setConfigToDelete] = useState<PriceConfiguration | null>(null);

  const canCreate = canAccess({ resource: 'price_configurations', action: 'create' });
  const canDelete = canAccess({ resource: 'price_configurations', action: 'delete' });

  const handleEdit = (config: PriceConfiguration) => {
    setSelectedConfig(config);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedConfig(null);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <p className="text-danger">Error al cargar los precios</p>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const addButton = canCreate && (
    <Button onClick={handleCreate}>
      <Plus className="size-4" />
      Añadir precio
    </Button>
  );

  const status = (config: PriceConfiguration) => (
    <StatusBadge tone={config.is_active ? 'ok' : 'neutral'}>{config.is_active ? 'Activo' : 'Inactivo'}</StatusBadge>
  );

  const actions = (config: PriceConfiguration) => (
    <div className="flex items-center justify-end gap-1">
      <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
        Editar
      </Button>
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

          <ul className="border-t border-border md:hidden">
            {priceConfigurations.map((config) => (
              <li key={config.id} className="flex flex-col gap-2 border-b border-border py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] font-semibold text-foreground">
                    {getPriceKeyDescription(config.key, config.category)}
                  </p>
                  {status(config)}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium tabular-nums text-foreground">{formatCurrency(config.price)}</span>
                  {actions(config)}
                </div>
              </li>
            ))}
          </ul>

          <table className="hidden w-full md:table">
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Concepto</th>
                <th className={`${th} text-right`}>Precio</th>
                <th className={th}>Estado</th>
                <th className={`${th} text-right`}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {priceConfigurations.map((config) => (
                <tr key={config.id} className="border-b border-border">
                  <td className="px-3 py-3">
                    <p className="text-[15px] font-semibold text-foreground">
                      {getPriceKeyDescription(config.key, config.category)}
                    </p>
                      </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums text-foreground">
                    {formatCurrency(config.price)}
                  </td>
                  <td className="px-3 py-3">{status(config)}</td>
                  <td className="px-3 py-3">{actions(config)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
