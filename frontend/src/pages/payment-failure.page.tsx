import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const REDSYS_ERROR_MESSAGES: Record<string, string> = {
  '0101': 'Tarjeta caducada',
  '0102': 'Tarjeta bloqueada temporalmente o en sospecha de fraude',
  '0104': 'Operacion no permitida para esa tarjeta',
  '0116': 'Saldo disponible insuficiente',
  '0118': 'Tarjeta no registrada',
  '0125': 'Tarjeta no operativa',
  '0129': 'Codigo de seguridad CVV incorrecto',
  '0180': 'Tarjeta ajena al servicio',
  '0184': 'Error en la autenticacion del titular',
  '0190': 'Operacion denegada por el emisor',
  '0191': 'Fecha de caducidad erronea',
  '0202': 'Tarjeta bloqueada o en sospecha de fraude',
  '0904': 'Error en el procesamiento del comercio',
  '0909': 'Error del sistema',
  '0912': 'Emisor no disponible',
  '0913': 'Pedido repetido',
  '9064': 'Numero de posiciones de tarjeta incorrecto',
  '9078': 'No existe metodo de pago valido',
  '9093': 'Tarjeta no existe',
  '9094': 'Rechazo de los servidores internacionales',
  '9104': 'Comercio con titular seguro y titular sin clave de compra segura',
  '9218': 'El comercio no permite operaciones seguras por entrada /telefonico',
  '9253': 'Tarjeta no cumple el check-digit',
  '9256': 'El comercio no puede realizar preautorizaciones',
  '9912': 'Error en el procesamiento',
  '9915': 'A peticion del usuario se ha cancelado el pago',
};

export const PaymentFailurePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('Ds_Order') || searchParams.get('orderId');
  const errorCode = searchParams.get('Ds_Response') || searchParams.get('errorCode');
  const [countdown, setCountdown] = useState(30);

  const errorMessage = errorCode ? REDSYS_ERROR_MESSAGES[errorCode] : null;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/payments');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">Pago No Completado</CardTitle>
          <CardDescription>Ha ocurrido un problema al procesar tu pago</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {orderId && (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Numero de pedido</p>
              <p className="text-lg font-mono font-medium">{orderId}</p>
            </div>
          )}

          {errorCode && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Codigo de error: {errorCode}
                  </p>
                  {errorMessage && (
                    <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-gray-600">
            <p>No se ha realizado ningun cargo en tu tarjeta.</p>
            <p className="mt-2">Puedes intentar de nuevo o contactar con soporte si el problema persiste.</p>
          </div>

          <div className="space-y-2">
            <Button onClick={() => navigate('/payments')} className="w-full">
              Volver a Intentar
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Ir al Inicio
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400">
            Seras redirigido automaticamente en {countdown} segundos...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
