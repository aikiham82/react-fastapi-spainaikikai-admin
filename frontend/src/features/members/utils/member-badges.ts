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

export function getMemberStatusLabel(status: string | null | undefined): string | null {
  if (status === 'inactive') return 'Baja';
  return null;
}
