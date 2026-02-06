import { useState } from 'react';
import { usePriceConfigurationContext } from '../hooks/usePriceConfigurationContext';
import { Settings, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/core/hooks/usePermissions';
import { PriceConfigurationForm } from './PriceConfigurationForm';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import type { PriceConfiguration } from '../data/schemas/price-configuration.schema';
import {
  getPriceKeyDescription,
  formatCurrency,
  PRICE_CATEGORY_LABELS,
} from '../data/schemas/price-configuration.schema';

export const PriceConfigurationList = () => {
  const {
    priceConfigurations,
    isLoading,
    error,
    deletePriceConfiguration,
    isDeleting,
  } = usePriceConfigurationContext();
  const { canAccess } = usePermissions();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<PriceConfiguration | null>(null);
  const [configToDelete, setConfigToDelete] = useState<PriceConfiguration | null>(null);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error al cargar las configuraciones de precios</p>
        <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      </div>
    );
  }

  if (priceConfigurations.length === 0) {
    return (
      <div className="text-center py-12">
        <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay configuraciones de precios</h3>
        <p className="text-gray-600 mb-4">Crea configuraciones para definir los precios de las licencias</p>
        {canAccess({ resource: 'price_configurations', action: 'create' }) && (
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Configuracion
          </Button>
        )}
        <PriceConfigurationForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          priceConfiguration={selectedConfig}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            {priceConfigurations.length} configuracion(es) encontrada(s)
          </p>
        </div>
        {canAccess({ resource: 'price_configurations', action: 'create' }) && (
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Configuracion
          </Button>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {priceConfigurations.map((config) => (
          <div key={config.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{getPriceKeyDescription(config.key, config.category)}</h3>
                <p className="text-sm text-gray-500 font-mono">{config.key}</p>
                <Badge variant="outline" className="mt-1">
                  {PRICE_CATEGORY_LABELS[config.category] || config.category}
                </Badge>
              </div>
              <Badge variant={config.is_active ? 'default' : 'secondary'}>
                {config.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            {config.description && (
              <p className="text-sm text-gray-700">{config.description}</p>
            )}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-medium text-gray-900 tabular-nums">{formatCurrency(config.price)}</span>
              <div className="flex items-center gap-2">
                {canAccess({ resource: 'price_configurations', action: 'update' }) && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(config)} aria-label="Editar configuracion">
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                {canAccess({ resource: 'price_configurations', action: 'delete' }) && (
                  <Button variant="ghost" size="icon" onClick={() => setConfigToDelete(config)} disabled={isDeleting} aria-label="Eliminar configuracion">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">Concepto</th>
                <th className="text-left p-4 font-medium text-gray-900">Categoria</th>
                <th className="text-left p-4 font-medium text-gray-900">Descripcion</th>
                <th className="text-right p-4 font-medium text-gray-900">Precio</th>
                <th className="text-center p-4 font-medium text-gray-900">Estado</th>
                <th className="text-right p-4 font-medium text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {priceConfigurations.map((config) => (
                <tr key={config.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium text-gray-900">
                      {getPriceKeyDescription(config.key, config.category)}
                    </p>
                    <p className="text-sm text-gray-500 font-mono">{config.key}</p>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">
                      {PRICE_CATEGORY_LABELS[config.category] || config.category}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-700">
                      {config.description || '-'}
                    </span>
                  </td>
                  <td className="p-4 text-right font-medium text-gray-900 tabular-nums">
                    {formatCurrency(config.price)}
                  </td>
                  <td className="p-4 text-center">
                    <Badge variant={config.is_active ? 'default' : 'secondary'}>
                      {config.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canAccess({ resource: 'price_configurations', action: 'update' }) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(config)}
                          aria-label="Editar configuracion"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canAccess({ resource: 'price_configurations', action: 'delete' }) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfigToDelete(config)}
                          disabled={isDeleting}
                          aria-label="Eliminar configuracion"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PriceConfigurationForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        priceConfiguration={selectedConfig}
      />

      <ConfirmDeleteDialog
        open={!!configToDelete}
        onOpenChange={(open) => !open && setConfigToDelete(null)}
        description={`Se eliminará permanentemente la configuración "${configToDelete ? getPriceKeyDescription(configToDelete.key, configToDelete.category) : ''}". Esta acción no se puede deshacer.`}
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
