import { useState, useEffect } from 'react';
import { useInsuranceContext } from '../hooks/useInsuranceContext';
import type { Insurance, CreateInsuranceRequest } from '../data/schemas/insurance.schema';
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

interface InsuranceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insurance?: Insurance | null;
  memberOptions?: { id: string; name: string }[];
}

export const InsuranceForm = ({ open, onOpenChange, insurance, memberOptions = [] }: InsuranceFormProps) => {
  const { createInsurance, updateInsurance } = useInsuranceContext();
  const isEditing = !!insurance;

  const [formData, setFormData] = useState<CreateInsuranceRequest>({
    member_id: '',
    insurance_type: 'accident',
    policy_number: '',
    start_date: '',
    end_date: '',
    amount: 0,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateInsuranceRequest, string>>>({});

  useEffect(() => {
    if (insurance) {
      setFormData({
        member_id: insurance.member_id || '',
        insurance_type: insurance.insurance_type || 'accident',
        policy_number: insurance.policy_number || '',
        start_date: insurance.start_date || '',
        end_date: insurance.end_date || '',
        amount: insurance.amount || 0,
      });
    } else {
      setFormData({
        member_id: '',
        insurance_type: 'accident',
        policy_number: '',
        start_date: '',
        end_date: '',
        amount: 0,
      });
    }
    setErrors({});
  }, [insurance, open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateInsuranceRequest, string>> = {};

    if (!formData.member_id) {
      newErrors.member_id = 'Debes seleccionar un miembro';
    }
    if (!formData.insurance_type) {
      newErrors.insurance_type = 'Debes seleccionar el tipo de seguro';
    }
    if (!formData.policy_number.trim()) {
      newErrors.policy_number = 'El número de póliza es obligatorio';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'La fecha de inicio es obligatoria';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'La fecha de fin es obligatoria';
    } else if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      newErrors.end_date = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }
    if (!formData.amount || formData.amount < 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditing && insurance) {
      updateInsurance(insurance.id, formData);
    } else {
      createInsurance(formData);
    }

    onOpenChange(false);
  };

  const handleChange = (field: keyof CreateInsuranceRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Seguro' : 'Crear Seguro'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza la información del seguro' : 'Completa la información para crear un nuevo seguro'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="insurance_type">Tipo de Seguro *</Label>
              <Select
                value={formData.insurance_type}
                onValueChange={(value: any) => handleChange('insurance_type', value)}
              >
                <SelectTrigger className={errors.insurance_type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accident">Seguro de Accidentes</SelectItem>
                  <SelectItem value="rc">Seguro de Responsabilidad Civil</SelectItem>
                </SelectContent>
              </Select>
              {errors.insurance_type && <p className="text-sm text-red-500">{errors.insurance_type}</p>}
            </div>

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
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy_number">Número de Póliza *</Label>
            <Input
              id="policy_number"
              value={formData.policy_number}
              onChange={(e) => handleChange('policy_number', e.target.value)}
              placeholder="P-123456"
              className={errors.policy_number ? 'border-red-500' : ''}
            />
            {errors.policy_number && <p className="text-sm text-red-500">{errors.policy_number}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha de Inicio *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className={errors.start_date ? 'border-red-500' : ''}
              />
              {errors.start_date && <p className="text-sm text-red-500">{errors.start_date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha de Fin *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className={errors.end_date ? 'border-red-500' : ''}
              />
              {errors.end_date && <p className="text-sm text-red-500">{errors.end_date}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
