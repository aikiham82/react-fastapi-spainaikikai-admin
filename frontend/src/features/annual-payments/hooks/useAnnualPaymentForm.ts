import { useState, useCallback, useMemo } from 'react';
import type { AnnualPaymentFormData, AnnualPaymentPrices, PaymentTotals } from '../data/schemas/annual-payment.schema';
import { defaultFormValues, calculateTotals, annualPaymentFormSchema } from '../data/schemas/annual-payment.schema';

const ZERO_PRICES: AnnualPaymentPrices = {
  club_fee: 0, kyu: 0, kyu_infantil: 0, dan: 0,
  fukushidoin: 0, shidoin: 0, seguro_accidentes: 0, seguro_rc: 0,
};

export interface UseAnnualPaymentFormReturn {
  formData: AnnualPaymentFormData;
  totals: PaymentTotals;
  errors: Record<string, string>;
  isValid: boolean;
  setField: <K extends keyof AnnualPaymentFormData>(field: K, value: AnnualPaymentFormData[K]) => void;
  reset: () => void;
  validate: () => boolean;
}

export function useAnnualPaymentForm(
  initialValues?: Partial<AnnualPaymentFormData>,
  prices?: AnnualPaymentPrices | null,
): UseAnnualPaymentFormReturn {
  const [formData, setFormData] = useState<AnnualPaymentFormData>({
    ...defaultFormValues,
    ...initialValues,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totals = useMemo(
    () => calculateTotals(formData, { ...ZERO_PRICES, ...prices }),
    [formData, prices]
  );

  const setField = useCallback(<K extends keyof AnnualPaymentFormData>(
    field: K,
    value: AnnualPaymentFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for the field when it changes
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const reset = useCallback(() => {
    setFormData({ ...defaultFormValues, ...initialValues });
    setErrors({});
  }, [initialValues]);

  const validate = useCallback(() => {
    const result = annualPaymentFormSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        newErrors[path] = issue.message;
      });
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  }, [formData]);

  const isValid = useMemo(() => {
    const result = annualPaymentFormSchema.safeParse(formData);
    return result.success;
  }, [formData]);

  return {
    formData,
    totals,
    errors,
    isValid,
    setField,
    reset,
    validate,
  };
}
