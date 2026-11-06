import { z } from 'zod';

export const EXAM_KEYS = [
  'examen_dan_1_hombu',
  'examen_dan_1',
  'examen_dan_2',
  'examen_dan_3',
  'examen_dan_4',
  'examen_dan_5',
  'examen_dan_6',
] as const;

export type ExamKey = (typeof EXAM_KEYS)[number];

export const EXAM_GRADE_NOTES: Partial<Record<ExamKey, string>> = {
  examen_dan_1_hombu: 'con nº Hombu',
  examen_dan_1: 'sin nº Hombu',
};

export const examGradeNumber = (exam: ExamKey): number => Number(exam.split('_')[2]);

const DAN_GRADE = /^(\d+)\D*dan$/i;

export const nextExamOf = (grade: string | null | undefined): ExamKey | null => {
  const match = DAN_GRADE.exec((grade ?? '').trim());
  if (!match) return null;
  const next = Number(match[1]) + 1;
  return next >= 2 && next <= 6 ? (`examen_dan_${next}` as ExamKey) : null;
};

export const examPriceSchema = z.object({
  key: z.string(),
  price: z.number(),
});

export type ExamPrice = z.infer<typeof examPriceSchema>;

export const examPaymentSchema = z.object({
  member_id: z.string().min(1, 'Elige un miembro'),
  exam: z.enum(EXAM_KEYS, { message: 'Elige el grado al que se presenta' }),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha del examen'),
  venue: z.string().trim().min(1, 'Indica el lugar del examen').max(200, 'Máximo 200 caracteres'),
  payer_name: z.string().trim().min(1, 'Indica quién paga').max(200, 'Máximo 200 caracteres'),
});

export type ExamPaymentFormData = z.infer<typeof examPaymentSchema>;

export const manualExamPaymentSchema = examPaymentSchema.extend({
  payment_method: z.enum(['cash', 'transfer', 'other']),
});

export type ManualExamPaymentFormData = z.infer<typeof manualExamPaymentSchema>;
