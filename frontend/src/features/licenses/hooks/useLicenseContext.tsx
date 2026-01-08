import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useLicensesQuery } from './queries/useLicenseQueries';
import { useCreateLicenseMutation, useUpdateLicenseMutation, useDeleteLicenseMutation } from './mutations/useLicenseMutations';
import type { License, CreateLicenseRequest, UpdateLicenseRequest, LicenseFilters } from '../data/schemas/license.schema';

interface LicenseContextType {
  licenses: License[];
  selectedLicense: License | null;
  isLoading: boolean;
  error: Error | null;
  filters: LicenseFilters;
  total: number;
  offset: number;
  limit: number;
  createLicense: (data: CreateLicenseRequest) => void;
  updateLicense: (id: string, data: UpdateLicenseRequest) => void;
  deleteLicense: (id: string) => void;
  selectLicense: (license: License | null) => void;
  setFilters: (filters: LicenseFilters) => void;
  setPagination: (offset: number, limit: number) => void;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export const LicenseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<LicenseFilters>({ limit: 20, offset: 0 });
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const { data: licensesData, isLoading, error } = useLicensesQuery(filters);
  const createMutation = useCreateLicenseMutation();
  const updateMutation = useUpdateLicenseMutation();
  const deleteMutation = useDeleteLicenseMutation();

  const handleCreateLicense = useCallback((data: CreateLicenseRequest) => {
    createMutation(data);
  }, [createMutation]);

  const handleUpdateLicense = useCallback((id: string, data: UpdateLicenseRequest) => {
    updateMutation({ id, data });
  }, [updateMutation]);

  const handleDeleteLicense = useCallback((id: string) => {
    deleteMutation(id);
  }, [deleteMutation]);

  const handleSetPagination = useCallback((offset: number, limit: number) => {
    setFilters({ ...filters, offset, limit });
  }, [filters, setFilters]);

  const value: LicenseContextType = {
    licenses: licensesData?.items || [],
    selectedLicense,
    isLoading,
    error,
    filters,
    total: licensesData?.total || 0,
    offset: licensesData?.offset || 0,
    limit: licensesData?.limit || 20,
    createLicense: handleCreateLicense,
    updateLicense: handleUpdateLicense,
    deleteLicense: handleDeleteLicense,
    selectLicense: setSelectedLicense,
    setFilters,
    setPagination: handleSetPagination,
  };

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
};

export const useLicenseContext = (): LicenseContextType => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicenseContext must be used within a LicenseProvider');
  }
  return context;
};
