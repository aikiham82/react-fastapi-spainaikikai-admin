import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { usePriceConfigurationContext } from '../hooks/usePriceConfigurationContext';
import type { PriceConfiguration } from '../data/schemas/price-configuration.schema';
import { PRICE_CONCEPTS, getPriceKeyDescription } from '../data/schemas/price-configuration.schema';

const formSchema = z.object({
  concept: z.string().min(1, 'Elige un concepto'),
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

const EMPTY_VALUES: FormData = { concept: '', price: 0, description: '', is_active: true };

export const PriceConfigurationForm = ({ open, onOpenChange, priceConfiguration }: PriceConfigurationFormProps) => {
  const { priceConfigurations, createPriceConfiguration, updatePriceConfiguration, isCreating, isUpdating } =
    usePriceConfigurationContext();
  const isEditing = !!priceConfiguration;
  const takenKeys = new Set(priceConfigurations.map((config) => config.key));

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (priceConfiguration) {
      reset({
        concept: priceConfiguration.key,
        price: priceConfiguration.price,
        description: priceConfiguration.description || '',
        is_active: priceConfiguration.is_active,
      });
    } else {
      reset(EMPTY_VALUES);
    }
  }, [priceConfiguration, open, reset]);

  const onSubmit = (data: FormData) => {
    if (isEditing && priceConfiguration) {
      updatePriceConfiguration(priceConfiguration.id, {
        price: data.price,
        description: data.description,
        is_active: data.is_active,
      });
    } else {
      const concept = PRICE_CONCEPTS.find((c) => c.key === data.concept);
      if (!concept) return;
      createPriceConfiguration({
        key: concept.key,
        price: data.price,
        description: data.description,
        category: concept.category,
        is_active: data.is_active,
      });
    }
    onOpenChange(false);
  };

  const isActive = watch('is_active');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar precio' : 'Nuevo precio'}</DialogTitle>
          <DialogDescription className="sr-only">Precio de un concepto de pago</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="concept">Concepto</Label>
            {isEditing && priceConfiguration ? (
              <p id="concept" className="text-[15px] font-medium text-foreground">
                {getPriceKeyDescription(priceConfiguration.key, priceConfiguration.category)}
              </p>
            ) : (
              <Controller
                control={control}
                name="concept"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="concept" className="h-11 w-full" aria-label="Concepto">
                      <SelectValue placeholder="Elige un concepto" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_CONCEPTS.map((concept) => {
                        const taken = takenKeys.has(concept.key);
                        return (
                          <SelectItem key={concept.key} value={concept.key} disabled={taken}>
                            {taken ? `${concept.label} (ya tiene precio)` : concept.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {errors.concept && <p className="text-sm text-danger">{errors.concept.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="price">Precio (€)</Label>
            <Input id="price" type="number" step="0.01" inputMode="decimal" className="h-11" {...register('price')} />
            {errors.price && <p className="text-sm text-danger">{errors.price.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea id="description" rows={2} {...register('description')} />
          </div>

          <div className="flex items-center gap-3">
            <Switch id="is_active" checked={isActive} onCheckedChange={(checked) => setValue('is_active', checked)} />
            <Label htmlFor="is_active">Precio activo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
