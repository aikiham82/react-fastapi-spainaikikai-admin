export const EXPIRING_SOON_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const daysUntil = (expiryDate: string, now: Date = new Date()): number =>
  Math.round((startOfDay(new Date(expiryDate)).getTime() - startOfDay(now).getTime()) / DAY_MS);

export const isExpiringSoon = (expiryDate: string, now: Date = new Date()): boolean => {
  const days = daysUntil(expiryDate, now);
  return days >= 0 && days <= EXPIRING_SOON_DAYS;
};
