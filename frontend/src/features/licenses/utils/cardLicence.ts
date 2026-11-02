import type { InstructorCategory, License } from '../data/schemas/license.schema';
import { daysUntil } from '@/core/utils/expiry';

const TITLE_RANK: Record<InstructorCategory, number> = { none: 0, fukushidoin: 1, shidoin: 2 };

const TITLES = ['shidoin', 'fukushidoin'];

const holdsOnlyATitle = (license: License): boolean =>
  TITLES.includes((license.grade ?? '').trim().toLowerCase());

const isRevoked = (license: License): boolean => license.status === 'revoked';

const isPastExpiry = (license: License, now: Date): boolean =>
  !!license.expiry_date && daysUntil(license.expiry_date, now) < 0;

const expiryTime = (license: License): number =>
  license.expiry_date ? new Date(license.expiry_date).getTime() : 0;

export const pickCardLicence = (licenses: License[], now: Date = new Date()): License | null => {
  const ranked = [...licenses].sort(
    (a, b) =>
      Number(isRevoked(a)) - Number(isRevoked(b)) ||
      Number(isPastExpiry(a, now)) - Number(isPastExpiry(b, now)) ||
      Number(holdsOnlyATitle(a)) - Number(holdsOnlyATitle(b)) ||
      expiryTime(b) - expiryTime(a),
  );
  return ranked[0] ?? null;
};

export const cardGrade = (licenses: License[]): string | null => {
  const holdingAGrade = licenses.filter((license) => !isRevoked(license) && !holdsOnlyATitle(license));
  return holdingAGrade.sort((a, b) => expiryTime(b) - expiryTime(a))[0]?.grade ?? null;
};

export const cardTitle = (licenses: License[]): InstructorCategory =>
  licenses
    .filter((license) => !isRevoked(license))
    .reduce<InstructorCategory>(
      (best, license) => (TITLE_RANK[license.instructor_category] > TITLE_RANK[best] ? license.instructor_category : best),
      'none',
    );
