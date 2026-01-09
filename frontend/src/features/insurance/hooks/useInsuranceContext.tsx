import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useInsuranceQuery } from './queries/useInsuranceQueries';
import { useCreateInsuranceMutation, useUpdateInsuranceMutation, useDeleteInsuranceMutation } from './mutations/useInsuranceMutations';
import type { Insurance, CreateInsuranceRequest, UpdateInsuranceRequest, InsuranceFilters } from '../data/schemas/insurance.schema';

interface InsuranceContextType {
  insuranceList: Insurance[];
  selectedInsurance: Insurance | null;
  isLoading: boolean;
  error: Error | null;
  filters: InsuranceFilters;
  total: number;
  offset: number;
  limit: number;
  createInsurance: (data: CreateInsuranceRequest) => void;
  updateInsurance: (id: string, data: UpdateInsuranceRequest) => void;
  deleteInsurance: (id: string) => void;
  selectInsurance: (insurance: Insurance | null) => void;
  setFilters: (filters: InsuranceFilters) => void;
  setPagination: (offset: number, limit: number) => void;
}

const InsuranceContext = createContext<InsuranceContextType | undefined>(undefined);

export const InsuranceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<InsuranceFilters>({ limit: 20, offset: 0 });
  const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null);
  const { data: insuranceData, isLoading, error } = useInsuranceQuery(filters);
  const createMutation = useCreateInsuranceMutation();
  const updateMutation = useUpdateInsuranceMutation();
  const deleteMutation = useDeleteInsuranceMutation();

  const handleCreateInsurance = useCallback((data: CreateInsuranceRequest) => {
    createMutation.mutate(data);
  }, [createMutation]);

  const handleUpdateInsurance = useCallback((id: string, data: UpdateInsuranceRequest) => {
    updateMutation.mutate({ id, data });
  }, [updateMutation]);

  const handleDeleteInsurance = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleSetPagination = useCallback((offset: number, limit: number) => {
    setFilters({ ...filters, offset, limit });
  }, [filters, setFilters]);

  const value: InsuranceContextType = {
    insuranceList: insuranceData?.items || [],
    selectedInsurance,
    isLoading,
    error,
    filters,
    total: insuranceData?.total || 0,
    offset: insuranceData?.offset || 0,
    limit: insuranceData?.limit || 20,
    createInsurance: handleCreateInsurance,
    updateInsurance: handleUpdateInsurance,
    deleteInsurance: handleDeleteInsurance,
    selectInsurance: setSelectedInsurance,
    setFilters,
    setPagination: handleSetPagination,
  };

  return <InsuranceContext.Provider value={value}>{children}</InsuranceContext.Provider>;
};

export const useInsuranceContext = (): InsuranceContextType => {
  const context = useContext(InsuranceContext);
  if (!context) {
    throw new Error('useInsuranceContext must be used within an InsuranceProvider');
  }
  return context;
};
