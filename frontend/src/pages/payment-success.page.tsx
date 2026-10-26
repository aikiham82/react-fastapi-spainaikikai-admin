import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AuthHeading, AuthLayout } from '@/features/auth/components/AuthLayout';

export const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('Ds_Order') || searchParams.get('orderId');

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <AuthHeading title="Pago completado">
          <p>Pago recibido. Te hemos enviado la factura por correo.</p>
          <p className="mt-2">Las licencias y los seguros quedan activos en unos minutos.</p>
        </AuthHeading>

        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full" asChild>
            <Link to="/club-payments">Ver el estado de pagos</Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full" asChild>
            <Link to="/">Ir al inicio</Link>
          </Button>
        </div>

        {orderId && <p className="text-[13px] text-muted-foreground">Pedido {orderId}.</p>}
      </div>
    </AuthLayout>
  );
};
