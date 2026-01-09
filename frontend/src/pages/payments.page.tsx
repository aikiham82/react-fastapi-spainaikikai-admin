import { PaymentProvider } from '@/features/payments/hooks/usePaymentContext';
import { PaymentList } from '@/features/payments/components/PaymentList';

export const PaymentsPage = () => {
  return (
    <PaymentProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-gray-600 mt-1">Gestiona los pagos de la asociación</p>
        </div>
        <PaymentList />
      </div>
    </PaymentProvider>
  );
};
