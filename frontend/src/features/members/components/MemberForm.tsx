import { useState, useEffect } from 'react';
import { useMemberContext } from '../hooks/useMemberContext';
import { useClubContext } from '../../clubs/hooks/useClubContext';
import type { Member, CreateMemberRequest } from '../data/schemas/member.schema';
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
    email: '',
    phone: '',
    date_of_birth: '',
    address: '',
    city: '',
    postal_code: '',
    club_id: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateMemberRequest, string>>>({});

  useEffect(() => {
    if (member) {
      setFormData({
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        email: member.email || '',
        phone: member.phone || '',
        date_of_birth: member.date_of_birth || '',
        address: member.address || '',
        city: member.city || '',
        postal_code: member.postal_code || '',
        club_id: member.club_id || '',
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        address: '',
        city: '',
        postal_code: '',
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
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Los apellidos son obligatorios';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    }
    if (!formData.date_of_birth) {
      newErrors.date_of_birth = 'La fecha de nacimiento es obligatoria';
    } else {
      const birthDate = new Date(formData.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 0 || age > 120) {
        newErrors.date_of_birth = 'Fecha de nacimiento inválida';
      }
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
    if (!formData.club_id) {
      newErrors.club_id = 'Debes seleccionar un club';
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
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="last_name">Apellidos *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                placeholder="Pérez García"
                className={errors.last_name ? 'border-red-500' : ''}
              />
              {errors.last_name && <p className="text-sm text-red-500">{errors.last_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Fecha de Nacimiento *</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleChange('date_of_birth', e.target.value)}
              className={errors.date_of_birth ? 'border-red-500' : ''}
            />
            {errors.date_of_birth && <p className="text-sm text-red-500">{errors.date_of_birth}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="club_id">Club *</Label>
            <Select
              value={formData.club_id}
              onValueChange={(value) => handleChange('club_id', value)}
            >
              <SelectTrigger className={errors.club_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona un club" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map((club) => (
                  <SelectItem key={club.id} value={club.id}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.club_id && <p className="text-sm text-red-500">{errors.club_id}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Calle Principal 123"
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
                placeholder="Madrid"
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
