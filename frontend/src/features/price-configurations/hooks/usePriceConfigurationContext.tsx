import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { usePriceConfigurationsQuery } from './queries/usePriceConfigurationQueries';
import {
  useCreatePriceConfigurationMutation,
  useUpdatePriceConfigurationMutation,
  useDeletePriceConfigurationMutation,
} from './mutations/usePriceConfigurationMutations';
import type {
  PriceConfiguration,
  CreatePriceConfigurationRequest,
  UpdatePriceConfigurationRequest,
} from '../data/schemas/price-configuration.schema';

interface PriceConfigurationContextType {
  priceConfigurations: PriceConfiguration[];
  selectedPriceConfiguration: PriceConfiguration | null;
  isLoading: boolean;
  error: Error | null;
  createPriceConfiguration: (data: CreatePriceConfigurationRequest) => void;
  updatePriceConfiguration: (id: string, data: UpdatePriceConfigurationRequest) => void;
  deletePriceConfiguration: (id: string) => void;
  selectPriceConfiguration: (config: PriceConfiguration | null) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

const PriceConfigurationContext = createContext<PriceConfigurationContextType | undefined>(undefined);

export const PriceConfigurationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedPriceConfiguration, setSelectedPriceConfiguration] = useState<PriceConfiguration | null>(null);
  const { data: priceConfigurations, isLoading, error } = usePriceConfigurationsQuery();
  const createMutation = useCreatePriceConfigurationMutation();
  const updateMutation = useUpdatePriceConfigurationMutation();
  const deleteMutation = useDeletePriceConfigurationMutation();

  const handleCreatePriceConfiguration = useCallback(
    (data: CreatePriceConfigurationRequest) => {
      createMutation.mutate(data);
    },
    [createMutation]
  );

  const handleUpdatePriceConfiguration = useCallback(
    (id: string, data: UpdatePriceConfigurationRequest) => {
      updateMutation.mutate({ id, data });
    },
    [updateMutation]
  );

  const handleDeletePriceConfiguration = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const value: PriceConfigurationContextType = {
    priceConfigurations: priceConfigurations || [],
    selectedPriceConfiguration,
    isLoading,
    error: error as Error | null,
    createPriceConfiguration: handleCreatePriceConfiguration,
    updatePriceConfiguration: handleUpdatePriceConfiguration,
    deletePriceConfiguration: handleDeletePriceConfiguration,
    selectPriceConfiguration: setSelectedPriceConfiguration,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };

  return (
    <PriceConfigurationContext.Provider value={value}>{children}</PriceConfigurationContext.Provider>
  );
};

export const usePriceConfigurationContext = (): PriceConfigurationContextType => {
  const context = useContext(PriceConfigurationContext);
  if (!context) {
    throw new Error('usePriceConfigurationContext must be used within a PriceConfigurationProvider');
  }
  return context;
};
