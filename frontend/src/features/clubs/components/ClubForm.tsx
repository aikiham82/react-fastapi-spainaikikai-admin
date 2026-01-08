import { useState, useEffect } from 'react';
import { useClubContext } from '../hooks/useClubContext';
import type { Club, CreateClubRequest } from '../data/schemas/club.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ClubFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  club?: Club | null;
}

export const ClubForm = ({ open, onOpenChange, club }: ClubFormProps) => {
  const { createClub, updateClub } = useClubContext();
  const isEditing = !!club;

  const [formData, setFormData] = useState<CreateClubRequest>({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateClubRequest, string>>>({});

  useEffect(() => {
    if (club) {
      setFormData({
        name: club.name || '',
        address: club.address || '',
        city: club.city || '',
        postal_code: club.postal_code || '',
        phone: club.phone || '',
        email: club.email || '',
        website: club.website || '',
      });
    } else {
      setFormData({
        name: '',
        address: '',
        city: '',
        postal_code: '',
        phone: '',
        email: '',
        website: '',
      });
    }
    setErrors({});
  }, [club, open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateClubRequest, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'La dirección es obligatoria';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'La ciudad es obligatoria';
    }
    if (!formData.postal_code.trim()) {
      newErrors.postal_code = 'El código postal es obligatorio';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditing && club) {
      updateClub(club.id, formData);
    } else {
      createClub(formData);
    }

    onOpenChange(false);
  };

  const handleChange = (field: keyof CreateClubRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Club' : 'Crear Club'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza la información del club' : 'Completa la información para crear un nuevo club'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nombre del club"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Dirección del club"
              className={errors.address ? 'border-red-500' : ''}
            />
            {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Ciudad"
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal_code">Código Postal *</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                placeholder="28001"
                className={errors.postal_code ? 'border-red-500' : ''}
              />
              {errors.postal_code && <p className="text-sm text-red-500">{errors.postal_code}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+34 600 000 000"
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="club@ejemplo.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Sitio Web</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://ejemplo.com"
            />
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
