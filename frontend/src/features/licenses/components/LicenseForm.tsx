import { useState, useEffect } from 'react';
import { useLicenseContext } from '../hooks/useLicenseContext';
import type { License, CreateLicenseRequest } from '../data/schemas/license.schema';
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

interface LicenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  license?: License | null;
  memberOptions?: { id: string; name: string }[];
}

export const LicenseForm = ({ open, onOpenChange, license, memberOptions = [] }: LicenseFormProps) => {
  const { createLicense, updateLicense } = useLicenseContext();
  const isEditing = !!license;

  const [formData, setFormData] = useState<CreateLicenseRequest>({
    member_id: '',
    issue_date: '',
    expiry_date: '',
    dan_grade: 6,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateLicenseRequest, string>>>({});

  useEffect(() => {
    if (license) {
      setFormData({
        member_id: license.member_id || '',
        issue_date: license.issue_date || '',
        expiry_date: license.expiry_date || '',
        dan_grade: license.dan_grade || 6,
      });
    } else {
      setFormData({
        member_id: '',
        issue_date: '',
        expiry_date: '',
        dan_grade: 6,
      });
    }
    setErrors({});
  }, [license, open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateLicenseRequest, string>> = {};

    if (!formData.member_id) {
      newErrors.member_id = 'Debes seleccionar un miembro';
    }
    if (!formData.issue_date) {
      newErrors.issue_date = 'La fecha de emisión es obligatoria';
    }
    if (!formData.expiry_date) {
      newErrors.expiry_date = 'La fecha de vencimiento es obligatoria';
    } else if (new Date(formData.expiry_date) <= new Date(formData.issue_date)) {
      newErrors.expiry_date = 'La fecha de vencimiento debe ser posterior a la fecha de emisión';
    }
    if (formData.dan_grade < 0 || formData.dan_grade > 10) {
      newErrors.dan_grade = 'El grado debe estar entre 0 y 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditing && license) {
      updateLicense(license.id, formData);
    } else {
      createLicense(formData);
    }

    onOpenChange(false);
  };

  const handleChange = (field: keyof CreateLicenseRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Licencia' : 'Crear Licencia'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza la información de la licencia' : 'Completa la información para crear una nueva licencia'}
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
              <Label htmlFor="issue_date">Fecha de Emisión *</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => handleChange('issue_date', e.target.value)}
                className={errors.issue_date ? 'border-red-500' : ''}
              />
              {errors.issue_date && <p className="text-sm text-red-500">{errors.issue_date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">Fecha de Vencimiento *</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => handleChange('expiry_date', e.target.value)}
                className={errors.expiry_date ? 'border-red-500' : ''}
              />
              {errors.expiry_date && <p className="text-sm text-red-500">{errors.expiry_date}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dan_grade">Grado Dan *</Label>
            <Select
              value={formData.dan_grade.toString()}
              onValueChange={(value) => handleChange('dan_grade', parseInt(value))}
            >
              <SelectTrigger className={errors.dan_grade ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona el grado" />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((grade) => (
                  <SelectItem key={grade} value={grade.toString()}>
                    {grade === 0 ? 'Kyu (0)' : `${grade}º Dan`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.dan_grade && <p className="text-sm text-red-500">{errors.dan_grade}</p>}
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
