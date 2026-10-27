import { useState, useEffect } from 'react';
import { useSeminarContext } from '../hooks/useSeminarContext';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
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
import { CoverImageDropZone } from './CoverImageDropZone';
import { toDateTimeLocalInput } from '@/core/utils/format';

interface SeminarFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seminar?: Seminar | null;
}

const FIELD_ORDER: (keyof CreateSeminarRequest)[] = ['title', 'instructor_name', 'start_date', 'end_date', 'venue', 'city', 'price'];

export const SeminarForm = ({ open, onOpenChange, seminar }: SeminarFormProps) => {
  const { createSeminar, updateSeminar } = useSeminarContext();
  const { clubId, userRole } = useAuthContext();
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
        start_date: toDateTimeLocalInput(seminar.start_date),
        end_date: toDateTimeLocalInput(seminar.end_date),
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
    if (!formData.city.trim()) {
      newErrors.city = 'La ciudad es obligatoria';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'La fecha de inicio es obligatoria';
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'La fecha de fin debe ser posterior a la de inicio';
    }
    if (formData.price < 0) {
      newErrors.price = 'El precio debe ser mayor o igual a 0';
    }

    setErrors(newErrors);
    const firstInvalid = FIELD_ORDER.find((field) => newErrors[field]);
    if (firstInvalid) {
      const element = document.getElementById(firstInvalid);
      element?.scrollIntoView({ block: 'center' });
      element?.focus();
    }
    return !firstInvalid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Format dates for backend (ISO 8601)
    const submitData: CreateSeminarRequest = {
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date || formData.start_date).toISOString(),
    };

    // Auto-assign club_id for club admins on creation
    if (!isEditing && userRole !== 'super_admin' && clubId) {
      submitData.club_id = clubId;
    }

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
      <DialogContent className="sm:max-w-[700px] ">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar seminario' : 'Nuevo seminario'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Cambia los datos del seminario.' : 'Los campos con * son obligatorios.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {seminar && (
            <div className="space-y-1">
              <Label>Imagen de portada</Label>
              <CoverImageDropZone
                seminarId={seminar.id}
                currentImageUrl={seminar.cover_image_url}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Ej.: Seminario de primavera"
              className={errors.title ? 'border-danger' : ''}
            />
            {errors.title && <p className="text-sm text-danger">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Ej.: Nivel, programa, qué llevar"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructor_name">Instructor *</Label>
            <Input
              id="instructor_name"
              value={formData.instructor_name}
              onChange={(e) => handleChange('instructor_name', e.target.value)}
              placeholder="Ej.: nombre del instructor"
              className={errors.instructor_name ? 'border-danger' : ''}
            />
            {errors.instructor_name && <p className="text-sm text-danger">{errors.instructor_name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha y hora de inicio *</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className={errors.start_date ? 'border-danger' : ''}
              />
              {errors.start_date && <p className="text-sm text-danger">{errors.start_date}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha y hora de fin</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className={errors.end_date ? 'border-danger' : ''}
              />
              {errors.end_date && <p className="text-sm text-danger">{errors.end_date}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Lugar *</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => handleChange('venue', e.target.value)}
              placeholder="Ej.: nombre del dojo o pabellón"
              className={errors.venue ? 'border-danger' : ''}
            />
            {errors.venue && <p className="text-sm text-danger">{errors.venue}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Ej.: calle y número"
              
            />
            
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Ej.: ciudad"
                className={errors.city ? 'border-danger' : ''}
              />
              {errors.city && <p className="text-sm text-danger">{errors.city}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Provincia</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => handleChange('province', e.target.value)}
                placeholder="Ej.: provincia"
                
              />
              
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_participants">Plazas máximas</Label>
              <Input
                id="max_participants"
                type="number"
                min="1"
                value={formData.max_participants || ''}
                onChange={(e) => handleChange('max_participants', parseInt(e.target.value) || undefined)}
                placeholder="Sin límite"
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
                className={errors.price ? 'border-danger' : ''}
              />
              {errors.price && <p className="text-sm text-danger">{errors.price}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Guardar cambios' : 'Crear seminario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
