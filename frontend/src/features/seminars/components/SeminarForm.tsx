import { useState, useEffect } from 'react';
import { useSeminarContext } from '../hooks/useSeminarContext';
import type { Seminar, CreateSeminarRequest } from '../data/schemas/seminar.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SeminarFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seminar?: Seminar | null;
}

export const SeminarForm = ({ open, onOpenChange, seminar }: SeminarFormProps) => {
  const { createSeminar, updateSeminar } = useSeminarContext();
  const isEditing = !!seminar;

  const [formData, setFormData] = useState<CreateSeminarRequest>({
    title: '',
    description: '',
    instructor_name: '',
    venue: '',
    address: '',
    city: '',
    province: '',
    start_date: '',
    end_date: '',
    max_participants: undefined,
    price: 0,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateSeminarRequest, string>>>({});

  useEffect(() => {
    if (seminar) {
      setFormData({
        title: seminar.title || '',
        description: seminar.description || '',
        instructor_name: seminar.instructor_name || '',
        venue: seminar.venue || '',
        address: seminar.address || '',
        city: seminar.city || '',
        province: seminar.province || '',
        start_date: seminar.start_date ? seminar.start_date.slice(0, 16) : '',
        end_date: seminar.end_date ? seminar.end_date.slice(0, 16) : '',
        max_participants: seminar.max_participants,
        price: seminar.price || 0,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        instructor_name: '',
        venue: '',
        address: '',
        city: '',
        province: '',
        start_date: '',
        end_date: '',
        max_participants: undefined,
        price: 0,
      });
    }
    setErrors({});
  }, [seminar, open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateSeminarRequest, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio';
    }
    if (!formData.instructor_name.trim()) {
      newErrors.instructor_name = 'El nombre del instructor es obligatorio';
    }
    if (!formData.venue.trim()) {
      newErrors.venue = 'El lugar es obligatorio';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'La dirección es obligatoria';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'La ciudad es obligatoria';
    }
    if (!formData.province.trim()) {
      newErrors.province = 'La provincia es obligatoria';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'La fecha de inicio es obligatoria';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'La fecha de fin es obligatoria';
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'La fecha de fin debe ser posterior a la de inicio';
    }
    if (formData.price < 0) {
      newErrors.price = 'El precio debe ser mayor o igual a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Format dates for backend (ISO 8601)
    const submitData = {
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
    };

    if (isEditing && seminar) {
      updateSeminar(seminar.id, submitData);
    } else {
      createSeminar(submitData);
    }

    onOpenChange(false);
  };

  const handleChange = (field: keyof CreateSeminarRequest, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Seminario' : 'Crear Seminario'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza la información del seminario' : 'Completa la información para crear un nuevo seminario'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Seminario de Aikido Avanzado"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe el contenido y objetivos del seminario..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructor_name">Instructor *</Label>
            <Input
              id="instructor_name"
              value={formData.instructor_name}
              onChange={(e) => handleChange('instructor_name', e.target.value)}
              placeholder="Sensei Juan Pérez"
              className={errors.instructor_name ? 'border-red-500' : ''}
            />
            {errors.instructor_name && <p className="text-sm text-red-500">{errors.instructor_name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha y Hora Inicio *</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className={errors.start_date ? 'border-red-500' : ''}
              />
              {errors.start_date && <p className="text-sm text-red-500">{errors.start_date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha y Hora Fin *</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className={errors.end_date ? 'border-red-500' : ''}
              />
              {errors.end_date && <p className="text-sm text-red-500">{errors.end_date}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Lugar/Local *</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => handleChange('venue', e.target.value)}
              placeholder="Dojo Central"
              className={errors.venue ? 'border-red-500' : ''}
            />
            {errors.venue && <p className="text-sm text-red-500">{errors.venue}</p>}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label htmlFor="province">Provincia *</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => handleChange('province', e.target.value)}
                placeholder="Madrid"
                className={errors.province ? 'border-red-500' : ''}
              />
              {errors.province && <p className="text-sm text-red-500">{errors.province}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_participants">Máximo de Participantes</Label>
              <Input
                id="max_participants"
                type="number"
                min="1"
                value={formData.max_participants || ''}
                onChange={(e) => handleChange('max_participants', parseInt(e.target.value) || undefined)}
                placeholder="50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Precio (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={errors.price ? 'border-red-500' : ''}
              />
              {errors.price && <p className="text-sm text-red-500">{errors.price}</p>}
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
