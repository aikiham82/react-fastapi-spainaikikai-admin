export type TechnicalGrade = 'dan' | 'kyu';
export type InstructorCategory = 'none' | 'fukushidoin' | 'shidoin';
export type AgeCategory = 'infantil' | 'adulto';
export type PriceCategory = 'license' | 'insurance' | 'club_fee' | 'seminar';

export interface PriceConfiguration {
  id: string;
  key: string;
  price: number;
  description: string;
  category: PriceCategory;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  // Parsed from key for convenience (only for license category)
  grado_tecnico?: TechnicalGrade;
  categoria_instructor?: InstructorCategory;
  categoria_edad?: AgeCategory;
}

export { formatCurrency } from '@/core/utils/format';

export interface CreatePriceConfigurationRequest {
  key: string;
  price: number;
  description?: string;
  category?: PriceCategory;
  is_active?: boolean;
  valid_from?: string;
  valid_until?: string;
}

export interface UpdatePriceConfigurationRequest {
  price?: number;
  description?: string;
  is_active?: boolean;
  valid_from?: string;
  valid_until?: string;
}

export interface LicensePriceQuery {
  grado_tecnico: TechnicalGrade;
  categoria_instructor: InstructorCategory;
  categoria_edad: AgeCategory;
}

export interface LicensePriceResponse {
  key: string;
  price: number;
  description: string;
}

export const PRICE_CATEGORY_LABELS: Record<PriceCategory, string> = {
  license: 'Licencia',
  insurance: 'Seguro',
  club_fee: 'Cuota de club',
  seminar: 'Seminario',
};

// Labels in Spanish
export const TECHNICAL_GRADE_LABELS: Record<TechnicalGrade, string> = {
  dan: 'Dan',
  kyu: 'Kyu',
};

export const INSTRUCTOR_CATEGORY_LABELS: Record<InstructorCategory, string> = {
  none: 'Sin categoría',
  fukushidoin: 'Fukushidoin',
  shidoin: 'Shidoin',
};

export const AGE_CATEGORY_LABELS: Record<AgeCategory, string> = {
  infantil: 'Infantil',
  adulto: 'Adulto',
};

// Helper to parse price configuration key
export const parsePriceKey = (key: string): { grado: TechnicalGrade; instructor: InstructorCategory; edad: AgeCategory } | null => {
  const parts = key.split('-');
  if (parts.length !== 3) return null;
  return {
    grado: parts[0] as TechnicalGrade,
    instructor: parts[1] as InstructorCategory,
    edad: parts[2] as AgeCategory,
  };
};

// Helper to build price configuration key
export const buildPriceKey = (grado: TechnicalGrade, instructor: InstructorCategory, edad: AgeCategory): string => {
  return `${grado}-${instructor}-${edad}`;
};

export interface PriceConcept {
  key: string;
  label: string;
  category: PriceCategory;
}

export const PRICE_CONCEPTS: readonly PriceConcept[] = [
  { key: 'club_fee', label: 'Cuota de club', category: 'club_fee' },
  { key: 'kyu-none-adulto', label: 'Licencia Kyu adulto', category: 'license' },
  { key: 'kyu-none-infantil', label: 'Licencia Kyu infantil', category: 'license' },
  { key: 'dan-none-adulto', label: 'Licencia Dan', category: 'license' },
  { key: 'dan-fukushidoin-adulto', label: 'Licencia Fukushidoin', category: 'license' },
  { key: 'dan-shidoin-adulto', label: 'Licencia Shidoin', category: 'license' },
  { key: 'seguro_accidentes', label: 'Seguro de accidentes', category: 'insurance' },
  { key: 'seguro_rc', label: 'Seguro de responsabilidad civil', category: 'insurance' },
];

// Helper to get human-readable price description
export const getPriceKeyDescription = (key: string, category?: PriceCategory): string => {
  const concept = PRICE_CONCEPTS.find((c) => c.key === key);
  if (concept) return concept.label;
  if (category === 'license' || !category) {
    const parsed = parsePriceKey(key);
    if (parsed) {
      const gradoLabel = TECHNICAL_GRADE_LABELS[parsed.grado];
      const instructorLabel = parsed.instructor !== 'none' ? ` - ${INSTRUCTOR_CATEGORY_LABELS[parsed.instructor]}` : '';
      const edadLabel = AGE_CATEGORY_LABELS[parsed.edad];
      return `${gradoLabel}${instructorLabel} (${edadLabel})`;
    }
  }
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};
