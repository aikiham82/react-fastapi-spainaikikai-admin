import { z } from "zod/v4";

export const LicenseResponseSchema = z.object({
  id: z.string(),
  license_number: z.string().nullable().optional(),
  member_id: z.string(),
  member_name: z.string().nullable().optional(),
  association_id: z.string().nullable().optional(),
  license_type: z.string().optional(),
  grade: z.string().nullable().optional(),
  dan_grade: z.number().optional(),
  technical_grade: z.string().optional(),
  instructor_category: z.string().optional(),
  age_category: z.string().optional(),
  status: z.string(),
  issue_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  renewal_date: z.string().nullable().optional(),
  is_renewed: z.boolean().optional(),
  image_url: z.string().nullable().optional(),
  last_payment_id: z.string().nullable().optional(),
});

export type LicenseResponse = z.infer<typeof LicenseResponseSchema>;

export function getExpiryDate(license: LicenseResponse): string | null {
  return license.expiry_date ?? license.expiration_date ?? null;
}

export function formatGrade(license: LicenseResponse): string {
  const grade = license.grade;
  if (grade) return grade;

  const { dan_grade, technical_grade, instructor_category } = license;

  if (instructor_category === "shidoin") return `Shidoin - ${dan_grade ?? 0}º Dan`;
  if (instructor_category === "fukushidoin")
    return `Fukushidoin - ${dan_grade ?? 0}º Dan`;

  if (technical_grade === "dan") return `${dan_grade ?? 0}º Dan`;
  return `${dan_grade ?? 0}º Kyu`;
}

export function isLicenseActive(license: LicenseResponse): boolean {
  return license.status === "active";
}
