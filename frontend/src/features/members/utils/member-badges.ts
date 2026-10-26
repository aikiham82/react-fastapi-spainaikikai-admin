import type { StatusTone } from '@/components/ui/status-badge';

export function formatGrade(grade: string | null | undefined): string {
  if (!grade) return 'Sin grado';
  return grade;
}

export function formatInstructorCategory(category: string | null | undefined): string | null {
  if (!category || category === 'none') return null;
  if (category === 'shidoin') return 'Shidoin';
  if (category === 'fukushidoin') return 'Fukushidoin';
  return category;
}

export function getLicenseStatusTone(status: string | null | undefined): StatusTone {
  switch (status) {
    case 'active': return 'ok';
    case 'expired': return 'bad';
    case 'pending': return 'warn';
    case 'revoked': return 'bad';
    default: return 'neutral';
  }
}

export function getLicenseStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'active': return 'Activa';
    case 'expired': return 'Caducada';
    case 'pending': return 'Pendiente';
    case 'revoked': return 'Revocada';
    default: return 'Sin licencia';
  }
}

export function getInsuranceStatusTone(has: boolean, status: string | null | undefined): StatusTone {
  if (!has) return 'neutral';
  switch (status) {
    case 'active': return 'ok';
    case 'expired': return 'bad';
    case 'pending': return 'warn';
    case 'cancelled': return 'bad';
    default: return 'neutral';
  }
}

export function getInsuranceStatusLabel(has: boolean, status: string | null | undefined): string {
  if (!has) return 'Sin seguro';
  switch (status) {
    case 'active': return 'Activo';
    case 'expired': return 'Caducado';
    case 'pending': return 'Pendiente';
    case 'cancelled': return 'Cancelado';
    default: return 'Sin seguro';
  }
}

export function getMemberStatusLabel(status: string | null | undefined): string | null {
  if (status === 'inactive') return 'Baja';
  return null;
}

export function getTechnicalGradeLabel(grade: string | null | undefined): string {
  switch (grade) {
    case 'dan': return 'Dan';
    case 'kyu': return 'Kyu';
    default: return '';
  }
}
