export const normalizeCountry = (country?: string | null): string =>
  !country || country.trim().toLowerCase() === 'spain' ? 'España' : country;
