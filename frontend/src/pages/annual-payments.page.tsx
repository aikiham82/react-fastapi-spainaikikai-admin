import { AnnualPaymentForm, AnnualPaymentProvider } from '@/features/annual-payments';

export const AnnualPaymentsPage: React.FC = () => {
  return (
    <AnnualPaymentProvider>
      <div className="container mx-auto py-6 px-4">
        <AnnualPaymentForm />
      </div>
    </AnnualPaymentProvider>
  );
};

export default AnnualPaymentsPage;
