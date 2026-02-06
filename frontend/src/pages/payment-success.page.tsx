import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('Ds_Order') || searchParams.get('orderId');

  useEffect(() => {
    // Auto-redirect after 10 seconds
    const timer = setTimeout(() => {
      navigate('/annual-payments');
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">Pago Completado</CardTitle>
          <CardDescription>Tu pago se ha procesado correctamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {orderId && (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Numero de pedido</p>
              <p className="text-lg font-mono font-medium">{orderId}</p>
            </div>
          )}

          <div className="text-center text-sm text-gray-600">
            <p>Recibiras un correo electronico con la factura y los detalles del pago.</p>
            <p className="mt-2">Tu licencia sera activada en breve.</p>
          </div>

          <div className="space-y-2">
            <Button onClick={() => navigate('/annual-payments')} className="w-full">
              Ver Mis Pagos
            </Button>
            <Button onClick={() => navigate('/licenses')} variant="outline" className="w-full">
              Ver Mis Licencias
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400">
            Seras redirigido automaticamente en 10 segundos...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
