export type TechnicalGrade = 'dan' | 'kyu';
export type InstructorCategory = 'none' | 'fukushidoin' | 'shidoin';
export type AgeCategory = 'infantil' | 'adulto';
export type PriceCategory = 'license' | 'insurance' | 'club_fee';

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

// Currency formatter
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

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
  club_fee: 'Cuota de Club',
};

// Labels in Spanish
export const TECHNICAL_GRADE_LABELS: Record<TechnicalGrade, string> = {
  dan: 'Dan',
  kyu: 'Kyu',
};

export const INSTRUCTOR_CATEGORY_LABELS: Record<InstructorCategory, string> = {
  none: 'Sin categoria',
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

// Helper to get human-readable price description
export const getPriceKeyDescription = (key: string, category?: PriceCategory): string => {
  if (category === 'license' || !category) {
    const parsed = parsePriceKey(key);
    if (parsed) {
      const gradoLabel = TECHNICAL_GRADE_LABELS[parsed.grado];
      const instructorLabel = parsed.instructor !== 'none' ? ` - ${INSTRUCTOR_CATEGORY_LABELS[parsed.instructor]}` : '';
      const edadLabel = AGE_CATEGORY_LABELS[parsed.edad];
      return `${gradoLabel}${instructorLabel} (${edadLabel})`;
    }
  }
  // For non-license categories or unparseable keys, return the key formatted
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};
