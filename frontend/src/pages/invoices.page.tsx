import { InvoiceProvider } from '@/features/invoices/hooks/useInvoiceContext';
import { InvoiceList } from '@/features/invoices/components/InvoiceList';

export const InvoicesPage = () => {
  return (
    <InvoiceProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-gray-600 mt-1">Gestiona las facturas de la asociacion</p>
        </div>
        <InvoiceList />
      </div>
    </InvoiceProvider>
  );
};
