import { useState, useEffect } from 'react';
import { usePaymentContext } from '../hooks/usePaymentContext';
import type { CreatePaymentRequest } from '../data/schemas/payment.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberOptions?: { id: string; name: string }[];
  seminarOptions?: { id: string; title: string }[];
}

export const PaymentForm = ({ open, onOpenChange, memberOptions = [], seminarOptions = [] }: PaymentFormProps) => {
  const { createPayment } = usePaymentContext();

  const [formData, setFormData] = useState<CreatePaymentRequest>({
    member_id: '',
    payment_type: 'license',
    amount: 0,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreatePaymentRequest, string>>>({});

  useEffect(() => {
    if (open) {
      setFormData({
        member_id: '',
        payment_type: 'license',
        amount: 0,
      });
    }
    setErrors({});
  }, [open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreatePaymentRequest, string>> = {};

    if (!formData.member_id) {
      newErrors.member_id = 'Debes seleccionar un miembro';
    }
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }
    if (formData.payment_type === 'seminar' && !formData.seminar_id) {
      newErrors.seminar_id = 'Debes seleccionar un seminario';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createPayment(formData);
    onOpenChange(false);
  };

  const handleChange = (field: keyof CreatePaymentRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const isSeminarPayment = formData.payment_type === 'seminar';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Pago</DialogTitle>
          <DialogDescription>
            Completa la información para registrar un nuevo pago. Si es un pago online, serás redirigido a la pasarela de pago.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment_type">Tipo de Pago *</Label>
            <Select
              value={formData.payment_type}
              onValueChange={(value: any) => {
                handleChange('payment_type', value);
                if (value !== 'seminar') {
                  handleChange('seminar_id', '');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="license">Licencia</SelectItem>
                <SelectItem value="accident_insurance">Seguro de Accidentes</SelectItem>
                <SelectItem value="rc_insurance">Seguro de RC</SelectItem>
                <SelectItem value="annual_fee">Cuota Anual</SelectItem>
                <SelectItem value="seminar">Seminario</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="member_id">Miembro *</Label>
            <Select
              value={formData.member_id}
              onValueChange={(value) => handleChange('member_id', value)}
            >
              <SelectTrigger className={errors.member_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona un miembro" />
              </SelectTrigger>
              <SelectContent>
                {memberOptions.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.member_id && <p className="text-sm text-red-500">{errors.member_id}</p>}
          </div>

          {isSeminarPayment && (
            <div className="space-y-2">
              <Label htmlFor="seminar_id">Seminario *</Label>
              <Select
                value={formData.seminar_id || ''}
                onValueChange={(value) => handleChange('seminar_id', value)}
              >
                <SelectTrigger className={errors.seminar_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecciona un seminario" />
                </SelectTrigger>
                <SelectContent>
                  {seminarOptions.map((seminar) => (
                    <SelectItem key={seminar.id} value={seminar.id}>
                      {seminar.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.seminar_id && <p className="text-sm text-red-500">{errors.seminar_id}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Monto (€) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Crear Pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
