import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { usePaymentsQuery } from './queries/usePaymentQueries';
import { useCreatePaymentMutation, useUpdatePaymentStatusMutation, useDeletePaymentMutation } from './mutations/usePaymentMutations';
import type { Payment, CreatePaymentRequest, UpdatePaymentStatusRequest, PaymentFilters } from '../data/schemas/payment.schema';

interface PaymentContextType {
  payments: Payment[];
  selectedPayment: Payment | null;
  isLoading: boolean;
  error: Error | null;
  filters: PaymentFilters;
  total: number;
  offset: number;
  limit: number;
  createPayment: (data: CreatePaymentRequest) => void;
  updatePaymentStatus: (id: string, data: UpdatePaymentStatusRequest) => void;
  deletePayment: (id: string) => void;
  selectPayment: (payment: Payment | null) => void;
  setFilters: (filters: PaymentFilters) => void;
  setPagination: (offset: number, limit: number) => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<PaymentFilters>({ limit: 20, offset: 0 });
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const { data: paymentsData, isLoading, error } = usePaymentsQuery(filters);
  const createPaymentMutation = useCreatePaymentMutation();
  const updateStatusMutation = useUpdatePaymentStatusMutation();
  const deleteMutation = useDeletePaymentMutation();

  const handleCreatePayment = useCallback((data: CreatePaymentRequest) => {
    createPaymentMutation.mutate(data);
  }, [createPaymentMutation]);

  const handleUpdatePaymentStatus = useCallback((id: string, data: UpdatePaymentStatusRequest) => {
    updateStatusMutation.mutate({ id, data });
  }, [updateStatusMutation]);

  const handleDeletePayment = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleSetPagination = useCallback((offset: number, limit: number) => {
    setFilters({ ...filters, offset, limit });
  }, [filters, setFilters]);

  const value: PaymentContextType = {
    payments: paymentsData?.items || [],
    selectedPayment,
    isLoading,
    error,
    filters,
    total: paymentsData?.total || 0,
    offset: paymentsData?.offset || 0,
    limit: paymentsData?.limit || 20,
    createPayment: handleCreatePayment,
    updatePaymentStatus: handleUpdatePaymentStatus,
    deletePayment: handleDeletePayment,
    selectPayment: setSelectedPayment,
    setFilters,
    setPagination: handleSetPagination,
  };

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
};

export const usePaymentContext = (): PaymentContextType => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePaymentContext must be used within a PaymentProvider');
  }
  return context;
};
