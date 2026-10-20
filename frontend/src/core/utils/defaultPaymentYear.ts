const OCTOBER = 9;

export const insuranceSeasonYear = (today: Date): number =>
  today.getMonth() >= OCTOBER ? today.getFullYear() + 1 : today.getFullYear();

export const defaultPaymentYear = insuranceSeasonYear;

export const seasonLabel = (seasonYear: number): string =>
  `${seasonYear - 1}-${String(seasonYear).slice(-2)}`;
