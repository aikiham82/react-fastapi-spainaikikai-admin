import { useState, useEffect } from 'react';
import { useMemberContext } from '../hooks/useMemberContext';
import { useClubContext } from '../../clubs/hooks/useClubContext';
import type { Member, CreateMemberRequest } from '../data/schemas/member.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member | null;
}

export const MemberForm = ({ open, onOpenChange, member }: MemberFormProps) => {
  const { createMember, updateMember } = useMemberContext();
  const { clubs } = useClubContext();
  const isEditing = !!member;

  const [formData, setFormData] = useState<CreateMemberRequest>({
    first_name: '',
    last_name: '',
    dni: '',
    email: '',
    phone: '',
    birth_date: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'España',
    club_id: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateMemberRequest, string>>>({});

  useEffect(() => {
    if (member) {
      setFormData({
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        dni: member.dni || '',
        email: member.email || '',
        phone: member.phone || '',
        birth_date: member.birth_date || '',
        address: member.address || '',
        city: member.city || '',
        province: member.province || '',
        postal_code: member.postal_code || '',
        country: member.country || 'España',
        club_id: member.club_id || '',
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        dni: '',
        email: '',
        phone: '',
        birth_date: '',
        address: '',
        city: '',
        province: '',
        postal_code: '',
        country: 'España',
        club_id: clubs.length > 0 ? clubs[0].id : '',
      });
    }
    setErrors({});
  }, [member, open, clubs]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateMemberRequest, string>> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es obligatorio';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    // Validación opcional de fecha de nacimiento si se proporciona
    if (formData.birth_date) {
      const birthDate = new Date(formData.birth_date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 0 || age > 120) {
        newErrors.birth_date = 'Fecha de nacimiento inválida';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditing && member) {
      updateMember(member.id, formData);
    } else {
      createMember(formData);
    }

    onOpenChange(false);
  };

  const handleChange = (field: keyof CreateMemberRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Miembro' : 'Crear Miembro'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza la información del miembro' : 'Completa la información para crear un nuevo miembro'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                placeholder="Juan"
                className={errors.first_name ? 'border-red-500' : ''}
              />
              {errors.first_name && <p className="text-sm text-red-500">{errors.first_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellidos</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                placeholder="Pérez García"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="juan@ejemplo.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+34 600 000 000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dni">DNI/NIE</Label>
            <Input
              id="dni"
              value={formData.dni}
              onChange={(e) => handleChange('dni', e.target.value)}
              placeholder="12345678X"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleChange('birth_date', e.target.value)}
                className={errors.birth_date ? 'border-red-500' : ''}
              />
              {errors.birth_date && <p className="text-sm text-red-500">{errors.birth_date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="club_id">Club</Label>
              <SearchableSelect
                options={clubs.map((club) => ({ value: club.id, label: club.name }))}
                value={formData.club_id ?? ''}
                onValueChange={(value) => handleChange('club_id', value)}
                placeholder="Selecciona un club"
                searchPlaceholder="Buscar club..."
                emptyMessage="No se encontraron clubs."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Calle Principal 123"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Murcia"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Provincia</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => handleChange('province', e.target.value)}
                placeholder="Murcia"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Código Postal</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                placeholder="30011"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="España"
              />
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
