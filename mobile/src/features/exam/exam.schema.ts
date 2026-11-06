import { z } from "zod/v4";

export const EXAM_KEYS = [
  "examen_dan_1_hombu",
  "examen_dan_1",
  "examen_dan_2",
  "examen_dan_3",
  "examen_dan_4",
  "examen_dan_5",
  "examen_dan_6",
] as const;

export type ExamKey = (typeof EXAM_KEYS)[number];

const ORDINALS: Record<number, string> = { 1: "1.er", 2: "2.º", 3: "3.er", 4: "4.º", 5: "5.º", 6: "6.º" };

export const examGradeLabel = (exam: ExamKey): string => `${ORDINALS[Number(exam.split("_")[2])]} Dan`;

export const EXAM_NOTES: Partial<Record<ExamKey, string>> = {
  examen_dan_1_hombu: "con nº Hombu",
  examen_dan_1: "sin nº Hombu",
};

const DAN_GRADE = /^(\d+)\D*dan$/i;

export function nextExamOf(grade: string | null | undefined): ExamKey | null {
  const match = DAN_GRADE.exec((grade ?? "").trim());
  if (!match) return null;
  const next = Number(match[1]) + 1;
  return next >= 2 && next <= 6 ? (`examen_dan_${next}` as ExamKey) : null;
}

const DAY_MONTH_YEAR = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function isoDateOf(text: string): string | null {
  const match = DAY_MONTH_YEAR.exec(text.trim());
  if (!match) return null;
  const [, day, month, year] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const formatEuros = (amount: number): string =>
  `${amount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export const ExamPriceSchema = z.object({ key: z.string(), price: z.number() });

export type ExamPrice = z.infer<typeof ExamPriceSchema>;

export const ExamPaymentStartSchema = z.object({ payment_id: z.string(), redirect_url: z.string() });

export interface ExamPaymentRequest {
  member_id: string;
  exam: ExamKey;
  exam_date: string;
  venue: string;
  payer_name: string;
}
