import { useState, useEffect } from 'react';
import { useSeminarContext } from '../hooks/useSeminarContext';
import type { Seminar, CreateSeminarRequest } from '../data/schemas/seminar.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    date: '',
    time: '',
    location: '',
    max_participants: undefined,
    price: 0,
    instructor: '',
    image_url: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateSeminarRequest, string>>>({});

  useEffect(() => {
    if (seminar) {
      setFormData({
        title: seminar.title || '',
        description: seminar.description || '',
        date: seminar.date || '',
        time: seminar.time || '',
        location: seminar.location || '',
        max_participants: seminar.max_participants,
        price: seminar.price || 0,
        instructor: seminar.instructor || '',
        image_url: seminar.image_url || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        max_participants: undefined,
        price: 0,
        instructor: '',
        image_url: '',
      });
    }
    setErrors({});
  }, [seminar, open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateSeminarRequest, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es obligatoria';
    }
    if (!formData.date) {
      newErrors.date = 'La fecha es obligatoria';
    }
    if (!formData.time) {
      newErrors.time = 'La hora es obligatoria';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'La ubicación es obligatoria';
    }
    if (!formData.price || formData.price < 0) {
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

    if (isEditing && seminar) {
      updateSeminar(seminar.id, formData);
    } else {
      createSeminar(formData);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe el contenido y objetivos del seminario..."
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={errors.date ? 'border-red-500' : ''}
              />
              {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Hora *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                className={errors.time ? 'border-red-500' : ''}
              />
              {errors.time && <p className="text-sm text-red-500">{errors.time}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Ubicación *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="Dojo Central, Madrid"
              className={errors.location ? 'border-red-500' : ''}
            />
            {errors.location && <p className="text-sm text-red-500">{errors.location}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="price">Precio (€) *</Label>
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

          <div className="space-y-2">
            <Label htmlFor="instructor">Instructor</Label>
            <Input
              id="instructor"
              value={formData.instructor}
              onChange={(e) => handleChange('instructor', e.target.value)}
              placeholder="Sensei Juan Pérez"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">URL de Imagen</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => handleChange('image_url', e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
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
