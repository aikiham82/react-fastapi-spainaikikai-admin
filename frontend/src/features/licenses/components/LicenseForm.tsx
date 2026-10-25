import { useState, useEffect } from 'react';
import { useLicenseContext } from '../hooks/useLicenseContext';
import type { License, CreateLicenseRequest, TechnicalGrade } from '../data/schemas/license.schema';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { AnnulmentPanel } from '@/core/components/AnnulmentPanel';
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

const EMPTY_FORM: CreateLicenseRequest = {
  member_id: '',
  issue_date: '',
  expiry_date: '',
  dan_grade: 1,
  technical_grade: 'dan',
  instructor_category: 'none',
  age_category: 'adulto',
};

const gradeLabel = (grade: number, technicalGrade: TechnicalGrade): string =>
  `${grade}º ${technicalGrade === 'kyu' ? 'Kyu' : 'Dan'}`;

export const LicenseForm = ({ open, onOpenChange, license, memberOptions = [] }: LicenseFormProps) => {
  const { createLicense, updateLicense } = useLicenseContext();
  const isEditing = !!license;

  const [formData, setFormData] = useState<CreateLicenseRequest>(EMPTY_FORM);

  const [errors, setErrors] = useState<Partial<Record<keyof CreateLicenseRequest, string>>>({});

  useEffect(() => {
    if (license) {
      setFormData({
        member_id: license.member_id || '',
        issue_date: license.issue_date?.split('T')[0] || '',
        expiry_date: license.expiry_date?.split('T')[0] || '',
        dan_grade: license.dan_grade || 1,
        technical_grade: license.technical_grade || 'dan',
        instructor_category: license.instructor_category || 'none',
        age_category: license.age_category || 'adulto',
      });
    } else {
      setFormData(EMPTY_FORM);
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
    const maxGrade = formData.technical_grade === 'kyu' ? 6 : 10;
    if (formData.dan_grade < 1 || formData.dan_grade > maxGrade) {
      newErrors.dan_grade = `El grado debe estar entre 1 y ${maxGrade}`;
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
      const gradeChanged =
        formData.dan_grade !== (license.dan_grade || 1) ||
        formData.technical_grade !== (license.technical_grade || 'dan');
      updateLicense(license.id, {
        issue_date: formData.issue_date,
        expiration_date: formData.expiry_date,
        ...(gradeChanged && { grade: gradeLabel(formData.dan_grade, formData.technical_grade ?? 'dan') }),
        technical_grade: formData.technical_grade,
        instructor_category: formData.instructor_category,
        age_category: formData.age_category,
      });
    } else {
      createLicense(formData);
    }

    onOpenChange(false);
  };

  const setAnnulled = (annulled: boolean) => {
    if (!license) return;
    updateLicense(license.id, { annulled });
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
      <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Licencia' : 'Crear Licencia'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza la información de la licencia' : 'Completa la información para crear una nueva licencia'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member_id">Miembro *</Label>
            <SearchableSelect
              id="member_id"
              options={memberOptions.map((m) => ({ value: m.id, label: m.name }))}
              value={formData.member_id}
              onValueChange={(value) => handleChange('member_id', value)}
              placeholder="Selecciona un miembro"
              searchPlaceholder="Buscar miembro..."
              emptyMessage="No se encontraron miembros."
              disabled={isEditing}
              className={errors.member_id ? 'border-red-500' : ''}
            />
            {errors.member_id && <p className="text-sm text-red-500">{errors.member_id}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="technical_grade">Tipo de Grado *</Label>
              <Select
                value={formData.technical_grade || 'dan'}
                onValueChange={(value) => {
                  const newGrade = value as 'dan' | 'kyu';
                  const maxGrade = newGrade === 'kyu' ? 6 : 10;
                  const currentGrade = formData.dan_grade > maxGrade ? 1 : formData.dan_grade;
                  setFormData(prev => ({ ...prev, technical_grade: newGrade, dan_grade: currentGrade }));
                }}
              >
                <SelectTrigger id="technical_grade" className="w-full">
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dan">Dan</SelectItem>
                  <SelectItem value="kyu">Kyu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dan_grade">Grado *</Label>
              <Select
                value={formData.dan_grade.toString()}
                onValueChange={(value) => handleChange('dan_grade', parseInt(value))}
              >
                <SelectTrigger id="dan_grade" className={`w-full ${errors.dan_grade ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Selecciona el grado" />
                </SelectTrigger>
                <SelectContent>
                  {(formData.technical_grade === 'kyu'
                    ? [1, 2, 3, 4, 5, 6]
                    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                  ).map((grade) => (
                    <SelectItem key={grade} value={grade.toString()}>
                      {`${grade}º ${formData.technical_grade === 'kyu' ? 'Kyu' : 'Dan'}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.dan_grade && <p className="text-sm text-red-500">{errors.dan_grade}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instructor_category">Categoría de instructor</Label>
              <Select
                value={formData.instructor_category ?? 'none'}
                onValueChange={(value) => handleChange('instructor_category', value)}
              >
                <SelectTrigger id="instructor_category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna</SelectItem>
                  <SelectItem value="fukushidoin">Fukushidoin</SelectItem>
                  <SelectItem value="shidoin">Shidoin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age_category">Categoría de edad</Label>
              <Select
                value={formData.age_category ?? 'adulto'}
                onValueChange={(value) => handleChange('age_category', value)}
              >
                <SelectTrigger id="age_category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adulto">Adulto</SelectItem>
                  <SelectItem value="infantil">Infantil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isEditing && license && (
            <AnnulmentPanel
              annulled={license.status === 'revoked'}
              annulledText="Anulada: no cuenta como vigente aunque sus fechas lo sean."
              activeText="No anulada: vigente o caducada según sus fechas."
              confirmTitle="¿Anular la licencia?"
              confirmText="Se guarda al momento y deja de contar como vigente. Lo que hayas cambiado en el formulario sin guardar se pierde."
              annulLabel="Anular licencia"
              reactivateLabel="Reactivar licencia"
              onToggle={setAnnulled}
            />
          )}

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
