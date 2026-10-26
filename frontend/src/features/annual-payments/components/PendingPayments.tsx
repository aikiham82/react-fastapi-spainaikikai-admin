import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/list-controls';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';
import { PRICE_CONCEPT_LABELS } from '../utils/payment-checklist';
import { PaymentSetup } from './PaymentSetup';
import { PaymentChecklist } from './PaymentChecklist';
import { PaymentSummary } from './PaymentSummary';
import { PaymentTotalBar } from './PaymentTotalBar';

const MissingPrices = () => {
  const { isClubAdmin, missingPrices } = useAnnualPaymentContext();

  if (isClubAdmin) {
    return <EmptyState title="El pago no está disponible todavía. Avisa a la Federación." />;
  }

  return (
    <EmptyState
      title="Faltan precios para poder pagar"
      description={`Falta el precio de: ${missingPrices.map((concept) => PRICE_CONCEPT_LABELS[concept]).join(', ')}.`}
      action={
        <Button asChild variant="outline">
          <Link to="/price-configurations">Ir a Precios</Link>
        </Button>
      }
    />
  );
};

export const PendingPayments = () => {
  const { isLoadingPrices, pricesError, formData, isLoadingPrefill, missingPrices, isClubAdmin } =
    useAnnualPaymentContext();

  if (isLoadingPrices) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando precios...
      </div>
    );
  }

  if (pricesError) {
    return isClubAdmin ? (
      <EmptyState title="El pago no está disponible todavía. Avisa a la Federación." />
    ) : (
      <EmptyState title="No se pudieron cargar los precios" description={pricesError} />
    );
  }

  const hasClub = !!formData.club_id;

  return (
    <div className="flex flex-col gap-6">
      <PaymentSetup />

      {!hasClub ? (
        <p className="border-y border-border py-8 text-sm text-muted-foreground">
          Elige un club para ver a sus miembros y lo que falta por pagar.
        </p>
      ) : isLoadingPrefill ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando datos del club...
        </div>
      ) : missingPrices.length > 0 ? (
        <MissingPrices />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <PaymentChecklist />
          <div className="lg:sticky lg:top-0">
            <PaymentSummary />
          </div>
        </div>
      )}

      {hasClub && !isLoadingPrefill && missingPrices.length === 0 && <PaymentTotalBar />}
    </div>
  );
};
