import { apiClient } from '@/core/data/apiClient';
import type { Invoice, InvoiceFilters } from '../schemas/invoice.schema';

const BASE_URL = '/api/v1/invoices';

export const getInvoices = async (filters?: InvoiceFilters): Promise<Invoice[]> => {
  return await apiClient.get<Invoice[]>(BASE_URL, { params: filters });
};

export const getInvoice = async (id: string): Promise<Invoice> => {
  return await apiClient.get<Invoice>(`${BASE_URL}/${id}`);
};

export const getMemberInvoices = async (memberId: string, limit?: number): Promise<Invoice[]> => {
  return await apiClient.get<Invoice[]>(`${BASE_URL}/member/${memberId}`, {
    params: { limit },
  });
};

export const downloadInvoicePdf = async (id: string): Promise<Blob> => {
  const response = await apiClient.get<Blob>(`${BASE_URL}/${id}/pdf`, {
    responseType: 'blob',
  });
  return response;
};

export const regenerateInvoicePdf = async (id: string): Promise<Invoice> => {
  return await apiClient.post<Invoice>(`${BASE_URL}/${id}/regenerate-pdf`);
};

// Helper to download PDF and trigger browser download
export const downloadAndSavePdf = async (invoiceId: string, invoiceNumber: string): Promise<void> => {
  const blob = await downloadInvoicePdf(invoiceId);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `factura_${invoiceNumber.replace('/', '-')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const invoiceService = {
  getInvoices,
  getInvoice,
  getMemberInvoices,
  downloadInvoicePdf,
  regenerateInvoicePdf,
  downloadAndSavePdf,
};
