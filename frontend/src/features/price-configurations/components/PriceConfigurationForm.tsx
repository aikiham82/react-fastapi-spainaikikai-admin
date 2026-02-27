import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { usePriceConfigurationContext } from '../hooks/usePriceConfigurationContext';
import type { PriceConfiguration, PriceCategory } from '../data/schemas/price-configuration.schema';
import {
  TECHNICAL_GRADE_LABELS,
  INSTRUCTOR_CATEGORY_LABELS,
  AGE_CATEGORY_LABELS,
  PRICE_CATEGORY_LABELS,
  buildPriceKey,
  parsePriceKey,
} from '../data/schemas/price-configuration.schema';

const formSchema = z.object({
  category: z.enum(['license', 'insurance', 'club_fee', 'seminar']),
  // License-specific fields
  grado_tecnico: z.enum(['dan', 'kyu']).optional(),
  categoria_instructor: z.enum(['none', 'fukushidoin', 'shidoin']).optional(),
  categoria_edad: z.enum(['infantil', 'adulto']).optional(),
  // Non-license key
  custom_key: z.string().optional(),
  price: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
  description: z.string().optional(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface PriceConfigurationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceConfiguration?: PriceConfiguration | null;
}

export const PriceConfigurationForm = ({
  open,
  onOpenChange,
  priceConfiguration,
}: PriceConfigurationFormProps) => {
  const { createPriceConfiguration, updatePriceConfiguration, isCreating, isUpdating } =
    usePriceConfigurationContext();
  const isEditing = !!priceConfiguration;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      category: 'license',
      grado_tecnico: 'kyu',
      categoria_instructor: 'none',
      categoria_edad: 'adulto',
      custom_key: '',
      price: 0,
      description: '',
      is_active: true,
    },
  });

  const watchedCategory = watch('category');

  useEffect(() => {
    if (priceConfiguration) {
      const parsed = parsePriceKey(priceConfiguration.key);
      const category = priceConfiguration.category || 'license';
      reset({
        category,
        grado_tecnico: parsed?.grado || 'kyu',
        categoria_instructor: parsed?.instructor || 'none',
        categoria_edad: parsed?.edad || 'adulto',
        custom_key: category !== 'license' ? priceConfiguration.key : '',
        price: priceConfiguration.price,
        description: priceConfiguration.description || '',
        is_active: priceConfiguration.is_active,
      });
    } else {
      reset({
        category: 'license',
        grado_tecnico: 'kyu',
        categoria_instructor: 'none',
        categoria_edad: 'adulto',
        custom_key: '',
        price: 0,
        description: '',
        is_active: true,
      });
    }
  }, [priceConfiguration, reset]);

  const onSubmit = (data: FormData) => {
    if (data.category !== 'license' && (!data.custom_key || !data.custom_key.trim())) {
      return;
    }
    const key = data.category === 'license'
      ? buildPriceKey(data.grado_tecnico!, data.categoria_instructor!, data.categoria_edad!)
      : data.custom_key!.trim();

    if (isEditing && priceConfiguration) {
      updatePriceConfiguration(priceConfiguration.id, {
        price: data.price,
        description: data.description,
        is_active: data.is_active,
      });
    } else {
      createPriceConfiguration({
        key,
        price: data.price,
        description: data.description,
        category: data.category as PriceCategory,
        is_active: data.is_active,
      });
    }
    onOpenChange(false);
  };

  const watchedIsActive = watch('is_active');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Configuracion de Precio' : 'Nueva Configuracion de Precio'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={watchedCategory}
              onValueChange={(value) => setValue('category', value as PriceCategory)}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoria" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRICE_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {watchedCategory === 'license' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grado_tecnico">Grado Tecnico</Label>
                  <Select
                    value={watch('grado_tecnico')}
                    onValueChange={(value) => setValue('grado_tecnico', value as 'dan' | 'kyu')}
                    disabled={isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar grado" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TECHNICAL_GRADE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.grado_tecnico && (
                    <p className="text-sm text-red-500">{errors.grado_tecnico.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria_instructor">Categoria Instructor</Label>
                  <Select
                    value={watch('categoria_instructor')}
                    onValueChange={(value) =>
                      setValue('categoria_instructor', value as 'none' | 'fukushidoin' | 'shidoin')
                    }
                    disabled={isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INSTRUCTOR_CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoria_instructor && (
                    <p className="text-sm text-red-500">{errors.categoria_instructor.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria_edad">Categoria Edad</Label>
                <Select
                  value={watch('categoria_edad')}
                  onValueChange={(value) => setValue('categoria_edad', value as 'infantil' | 'adulto')}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AGE_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoria_edad && (
                  <p className="text-sm text-red-500">{errors.categoria_edad.message}</p>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="custom_key">Clave</Label>
              <Input
                id="custom_key"
                {...register('custom_key')}
                placeholder="ej: seguro_accidentes, club_fee"
                disabled={isEditing}
              />
              {errors.custom_key && (
                <p className="text-sm text-red-500">{errors.custom_key.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="price">Precio (EUR)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register('price')}
              placeholder="0.00"
            />
            {errors.price && (
              <p className="text-sm text-red-500">{errors.price.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripcion</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descripcion opcional..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={watchedIsActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
            <Label htmlFor="is_active">Configuracion activa</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
