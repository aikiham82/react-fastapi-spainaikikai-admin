const OCTOBER = 9;

export const defaultPaymentYear = (today: Date): number =>
  today.getMonth() >= OCTOBER ? today.getFullYear() + 1 : today.getFullYear();
