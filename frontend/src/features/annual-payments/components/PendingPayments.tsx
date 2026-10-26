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
          <Link to="/price-configurations">Ir a precios</Link>
        </Button>
      }
    />
  );
};

export const PendingPayments = () => {
  const {
    isLoadingPrices,
    pricesError,
    formData,
    isLoadingPrefill,
    missingPrices,
    missingTickedPrices,
    isClubAdmin,
    hasLoadError,
    retryLoad,
  } = useAnnualPaymentContext();

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
      ) : hasLoadError ? (
        <EmptyState
          title="No hemos podido comprobar lo que ya está pagado. Inténtalo de nuevo."
          action={
            <Button type="button" variant="outline" onClick={retryLoad}>
              Reintentar
            </Button>
          }
        />
      ) : isLoadingPrefill ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando datos del club...
        </div>
      ) : missingPrices.length > 0 ? (
        <MissingPrices />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            {missingTickedPrices.length > 0 && (
              <p role="alert" className="rounded-md bg-warning-soft px-4 py-3 text-sm text-warning">
                {missingTickedPrices.map((concept) => PRICE_CONCEPT_LABELS[concept]).join(', ')}{' '}
                {missingTickedPrices.length === 1 ? 'no tiene' : 'no tienen'} precio todavía. Elige otro tipo o avisa a la
                Federación.
              </p>
            )}
            <PaymentChecklist />
          </div>
          <div className="lg:sticky lg:top-0">
            <PaymentSummary />
          </div>
        </div>
      )}

      {hasClub && !hasLoadError && !isLoadingPrefill && missingPrices.length === 0 && <PaymentTotalBar />}
    </div>
  );
};
