import { z } from "zod/v4";

export const LicenseResponseSchema = z.object({
  id: z.string(),
  license_number: z.string().optional(),
  member_id: z.string(),
  member_name: z.string().nullable().optional(),
  dan_grade: z.number(),
  technical_grade: z.string(),
  instructor_category: z.string(),
  status: z.string(),
  issue_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  club_id: z.string().nullable().optional(),
});

export type LicenseResponse = z.infer<typeof LicenseResponseSchema>;

export function formatGrade(license: LicenseResponse): string {
  const { dan_grade, technical_grade, instructor_category } = license;

  if (instructor_category === "shidoin") return `Shidoin - ${dan_grade}º Dan`;
  if (instructor_category === "fukushidoin")
    return `Fukushidoin - ${dan_grade}º Dan`;

  if (technical_grade === "dan") return `${dan_grade}º Dan`;
  return `${dan_grade}º Kyu`;
}

export function isLicenseActive(license: LicenseResponse): boolean {
  return license.status === "active";
}
