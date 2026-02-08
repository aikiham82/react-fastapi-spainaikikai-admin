type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

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

export function getInstructorBadgeVariant(category: string | null | undefined): BadgeVariant {
  if (category === 'shidoin') return 'default';
  if (category === 'fukushidoin') return 'outline';
  return 'secondary';
}

export function getLicenseStatusVariant(status: string | null | undefined): BadgeVariant {
  switch (status) {
    case 'active': return 'success';
    case 'expired': return 'destructive';
    case 'pending': return 'warning';
    case 'revoked': return 'destructive';
    default: return 'secondary';
  }
}

export function getLicenseStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'active': return 'Activa';
    case 'expired': return 'Expirada';
    case 'pending': return 'Pendiente';
    case 'revoked': return 'Revocada';
    default: return 'Sin licencia';
  }
}

export function getInsuranceStatusVariant(has: boolean, status: string | null | undefined): BadgeVariant {
  if (!has) return 'secondary';
  switch (status) {
    case 'active': return 'success';
    case 'expired': return 'destructive';
    case 'pending': return 'warning';
    case 'cancelled': return 'destructive';
    default: return 'secondary';
  }
}

export function getInsuranceStatusLabel(has: boolean, status: string | null | undefined): string {
  if (!has) return 'Sin seguro';
  switch (status) {
    case 'active': return 'Activo';
    case 'expired': return 'Expirado';
    case 'pending': return 'Pendiente';
    case 'cancelled': return 'Cancelado';
    default: return 'Sin seguro';
  }
}

export function getMemberStatusLabel(status: string | null | undefined): string | null {
  if (status === 'inactive') return 'Baja';
  return null;
}

export function getMemberStatusVariant(status: string | null | undefined): BadgeVariant {
  if (status === 'inactive') return 'secondary';
  return 'secondary';
}

export function getTechnicalGradeLabel(grade: string | null | undefined): string {
  switch (grade) {
    case 'dan': return 'Dan';
    case 'kyu': return 'Kyu';
    default: return '';
  }
}
