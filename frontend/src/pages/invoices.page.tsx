import { InvoiceProvider } from '@/features/invoices/hooks/useInvoiceContext';
import { InvoiceList } from '@/features/invoices/components/InvoiceList';

export const InvoicesPage = () => {
  return (
    <InvoiceProvider>
      <InvoiceList />
    </InvoiceProvider>
  );
};
