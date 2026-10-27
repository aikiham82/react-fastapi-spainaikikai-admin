import { useState, useEffect } from 'react';
import { normalizeCountry } from '@/core/utils/country';
import { useMemberContext } from '../hooks/useMemberContext';
import { useClubContext } from '../../clubs/hooks/useClubContext';
import type { Member, CreateMemberRequest } from '../data/schemas/member.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatGradeNumber, GRADE_NUMBERS } from '@/core/utils/grade';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { MemberAccessAccount } from '@/features/users/components/MemberAccessAccount';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const localToday = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};


const joinDateOf = (member: Member): string =>
  (member.registration_date ?? member.created_at ?? '').substring(0, 10);

const gradeKindOf = (member?: Member | null): 'kyu' | 'dan' | null => {
  const summary = member?.license_summary;
  if (summary?.status !== 'active') return null;
  return summary.technical_grade === 'kyu' || summary.technical_grade === 'dan' ? summary.technical_grade : null;
};

const gradeNumberOf = (member?: Member | null): string =>
  /\d+/.exec(member?.license_summary?.grade ?? '')?.[0] ?? '';

const gradeLockOf = (member: Member | null | undefined, isSuperAdmin: boolean, ownMemberId?: string): string | null => {
  if (!gradeKindOf(member)) return 'Este socio aún no tiene licencia en vigor.';
  if (isSuperAdmin) return null;
  if (member?.status === 'inactive') return 'El grado de un socio de baja no se cambia.';
  if (member?.id === ownMemberId) return 'Tu grado lo cambia la federación.';
  return null;
};

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member | null;
}

export const MemberForm = ({ open, onOpenChange, member }: MemberFormProps) => {
  const { createMember, updateMember, changeMemberGrade } = useMemberContext();
  const { clubs } = useClubContext();
  const { userRole, clubId: ownClubId, currentUser } = useAuthContext();
  const isSuperAdmin = userRole === 'super_admin';
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

  const gradeKind = gradeKindOf(member);
  const gradeLock = gradeLockOf(member, isSuperAdmin, currentUser?.member_id);
  const savedGradeNumber = gradeNumberOf(member);
  const [gradeNumber, setGradeNumber] = useState(savedGradeNumber);

  const [errors, setErrors] = useState<Partial<Record<keyof CreateMemberRequest, string>>>({});

  useEffect(() => {
    if (member) {
      setFormData({
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        dni: member.dni || '',
        email: member.email || '',
        phone: member.phone || '',
        birth_date: member.birth_date ? member.birth_date.substring(0, 10) : '',
        address: member.address || '',
        city: member.city || '',
        province: member.province || '',
        postal_code: member.postal_code || '',
        country: normalizeCountry(member.country),
        club_id: member.club_id || '',
        registration_date: joinDateOf(member),
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
        club_id: isSuperAdmin ? '' : ownClubId ?? '',
        registration_date: localToday(),
      });
    }
    setGradeNumber(savedGradeNumber);
    setErrors({});
  }, [member, open, isSuperAdmin, ownClubId, savedGradeNumber]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateMemberRequest, string>> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es obligatorio';
    }
    if (isSuperAdmin && !formData.club_id) {
      newErrors.club_id = 'Selecciona un club';
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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
    if (formData.registration_date && formData.registration_date > localToday()) {
      newErrors.registration_date = 'La fecha de alta no puede ser futura';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const close = () => onOpenChange(false);
    if (isEditing && member) {
      const { registration_date, ...rest } = formData;
      const saveMember = () => updateMember(member.id, registration_date === joinDateOf(member) ? rest : formData, close);
      if (gradeNumber && gradeNumber !== savedGradeNumber) {
        changeMemberGrade(member.id, Number(gradeNumber), saveMember);
      } else {
        saveMember();
      }
    } else {
      createMember(formData, close);
    }
  };

  const handleChange = (field: keyof CreateMemberRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const field = (id: keyof CreateMemberRequest, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={(formData[id] as string | undefined) ?? ''}
        onChange={(e) => handleChange(id, e.target.value)}
        className={errors[id] ? 'border-danger' : ''}
        aria-invalid={!!errors[id]}
        {...props}
      />
      {errors[id] && <p className="text-sm text-danger">{errors[id]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (!isEditing) document.getElementById('first_name')?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar miembro' : 'Nuevo miembro'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Actualiza los datos del miembro' : 'Rellena los datos para dar de alta a un miembro'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('first_name', 'Nombre *')}
            {field('last_name', 'Apellidos')}
            {field('email', 'Correo electrónico', { type: 'email', placeholder: 'Ej.: nombre@ejemplo.com' })}
            {field('phone', 'Teléfono', { type: 'tel', placeholder: 'Ej.: 600 000 000' })}
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="club_id">Club *</Label>
                <SearchableSelect
                  id="club_id"
                  options={clubs.map((club) => ({ value: club.id, label: club.name }))}
                  value={formData.club_id ?? ''}
                  onValueChange={(value) => handleChange('club_id', value)}
                  placeholder="Selecciona un club"
                  searchPlaceholder="Buscar club..."
                  emptyMessage="No se encontraron clubs."
                />
                {errors.club_id && <p className="text-sm text-danger">{errors.club_id}</p>}
              </div>
            )}
            {field('registration_date', 'Fecha de alta', { type: 'date' })}
            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="grade_number">Grado</Label>
                <Select value={gradeNumber} onValueChange={setGradeNumber} disabled={!!gradeLock}>
                  <SelectTrigger id="grade_number" className="w-full text-base sm:text-sm">
                    <SelectValue placeholder={gradeKind ? 'Sin número' : 'Sin licencia'} />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeKind && GRADE_NUMBERS[gradeKind].map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {formatGradeNumber(value, gradeKind)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {gradeLock ?? 'El paso a dan y los títulos los gestiona la federación.'}
                </p>
              </div>
            )}
          </div>

          <details className="border-t border-border pt-3" open={errors.birth_date ? true : undefined}>
            <summary className="cursor-pointer text-sm font-medium text-foreground">Más datos</summary>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {field('dni', 'DNI o NIE', { placeholder: 'Ej.: 12345678X' })}
              {field('birth_date', 'Fecha de nacimiento', { type: 'date' })}
              <div className="sm:col-span-2">{field('address', 'Dirección', { placeholder: 'Ej.: Calle Mayor 1' })}</div>
              {field('city', 'Ciudad')}
              {field('province', 'Provincia')}
              {field('postal_code', 'Código postal', { placeholder: 'Ej.: 30001' })}
              {field('country', 'País')}
            </div>
          </details>

          {isEditing && member?.id && (
            <div className="border-t border-border pt-4">
              <MemberAccessAccount
                memberId={member.id}
                memberEmail={member.email ?? undefined}
                memberName={`${member.first_name} ${member.last_name ?? ''}`.trim()}
                memberClubRole={member.club_role}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Guardar cambios' : 'Crear miembro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
