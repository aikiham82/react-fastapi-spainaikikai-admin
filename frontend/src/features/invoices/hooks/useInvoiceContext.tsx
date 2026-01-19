import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useInvoicesQuery } from './queries/useInvoiceQueries';
import {
  useDownloadInvoicePdfMutation,
  useRegenerateInvoicePdfMutation,
} from './mutations/useInvoiceMutations';
import type { Invoice, InvoiceFilters } from '../data/schemas/invoice.schema';

interface InvoiceContextType {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  isLoading: boolean;
  error: Error | null;
  filters: InvoiceFilters;
  downloadPdf: (invoiceId: string, invoiceNumber: string) => void;
  regeneratePdf: (invoiceId: string) => void;
  selectInvoice: (invoice: Invoice | null) => void;
  setFilters: (filters: InvoiceFilters) => void;
  isDownloading: boolean;
  isRegenerating: boolean;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { data: invoices, isLoading, error } = useInvoicesQuery(filters);
  const downloadMutation = useDownloadInvoicePdfMutation();
  const regenerateMutation = useRegenerateInvoicePdfMutation();

  const handleDownloadPdf = useCallback(
    (invoiceId: string, invoiceNumber: string) => {
      downloadMutation.mutate({ invoiceId, invoiceNumber });
    },
    [downloadMutation]
  );

  const handleRegeneratePdf = useCallback(
    (invoiceId: string) => {
      regenerateMutation.mutate(invoiceId);
    },
    [regenerateMutation]
  );

  const value: InvoiceContextType = {
    invoices: invoices || [],
    selectedInvoice,
    isLoading,
    error: error as Error | null,
    filters,
    downloadPdf: handleDownloadPdf,
    regeneratePdf: handleRegeneratePdf,
    selectInvoice: setSelectedInvoice,
    setFilters,
    isDownloading: downloadMutation.isPending,
    isRegenerating: regenerateMutation.isPending,
  };

  return <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>;
};

export const useInvoiceContext = (): InvoiceContextType => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoiceContext must be used within an InvoiceProvider');
  }
  return context;
};
