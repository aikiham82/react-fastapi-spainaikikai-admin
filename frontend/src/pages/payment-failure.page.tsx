import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AuthHeading, AuthLayout } from '@/features/auth/components/AuthLayout';

const CANCELLED_BY_USER = '9915';

const REDSYS_ERROR_MESSAGES: Record<string, string> = {
  '0101': 'Tarjeta caducada',
  '0102': 'Tarjeta bloqueada temporalmente o en sospecha de fraude',
  '0104': 'Operación no permitida para esa tarjeta',
  '0116': 'Saldo disponible insuficiente',
  '0118': 'Tarjeta no registrada',
  '0125': 'Tarjeta no operativa',
  '0129': 'Código de seguridad CVV incorrecto',
  '0180': 'Tarjeta ajena al servicio',
  '0184': 'Error en la autenticación del titular',
  '0190': 'Operación denegada por el emisor',
  '0191': 'Fecha de caducidad errónea',
  '0202': 'Tarjeta bloqueada o en sospecha de fraude',
  '0904': 'Error en el procesamiento del comercio',
  '0909': 'Error del sistema',
  '0912': 'Emisor no disponible',
  '0913': 'Pedido repetido',
  '9064': 'Número de posiciones de tarjeta incorrecto',
  '9078': 'No existe método de pago válido',
  '9093': 'Tarjeta no existe',
  '9094': 'Rechazo de los servidores internacionales',
  '9104': 'Comercio con titular seguro y titular sin clave de compra segura',
  '9218': 'El comercio no permite operaciones seguras por entrada telefónica',
  '9253': 'Tarjeta no cumple el check-digit',
  '9256': 'El comercio no puede realizar preautorizaciones',
  '9912': 'Error en el procesamiento',
  '9915': 'A petición del usuario se ha cancelado el pago',
};

export const PaymentFailurePage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('Ds_Order') || searchParams.get('orderId');
  const errorCode = searchParams.get('Ds_Response') || searchParams.get('errorCode');

  const cancelled = errorCode === CANCELLED_BY_USER;
  const reason = errorCode && !cancelled ? REDSYS_ERROR_MESSAGES[errorCode] : null;

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <AuthHeading title={cancelled ? 'Pago cancelado' : 'El pago no se ha completado'}>
          {cancelled
            ? 'Has cancelado el pago. No se ha cobrado nada.'
            : 'El banco ha rechazado el pago. No se ha cobrado nada.'}
        </AuthHeading>

        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full" asChild>
            <Link to="/payments">Volver a intentarlo</Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full" asChild>
            <Link to="/">Ir al inicio</Link>
          </Button>
        </div>

        {(reason || orderId) && (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {reason && <>Motivo: {reason} (código {errorCode}). </>}
            {orderId && <>Pedido {orderId}.</>}
          </p>
        )}
      </div>
    </AuthLayout>
  );
};
