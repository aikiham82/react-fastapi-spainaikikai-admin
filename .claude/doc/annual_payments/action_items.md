# Annual Payments Feature - Action Items

**Date**: 2026-01-30
**Priority**: HIGH - Must address before production deployment

---

## Critical Issues (MUST FIX)

### 1. Add Maximum Quantity Limits

**Priority**: 🔴 CRITICAL
**Estimated Effort**: 2 hours
**Files to Modify**:
- `/frontend/src/features/annual-payments/hooks/useAnnualPaymentForm.ts`
- `/frontend/src/features/annual-payments/data/schemas/annual-payment.schema.ts`

**Issue**:
Currently, users can increment quantities indefinitely, which could lead to:
- Unrealistic orders (e.g., 9999 licenses)
- Potential overflow errors
- Database issues
- Financial/operational problems

**Solution**:
```typescript
// In annual-payment.schema.ts, add:
export const QUANTITY_LIMITS = {
  max_per_item: 200,
} as const;

// Update schema validation:
kyu_count: z.number().min(0).max(QUANTITY_LIMITS.max_per_item,
  `Máximo ${QUANTITY_LIMITS.max_per_item} licencias por tipo`),
// ... repeat for all quantity fields

// In useAnnualPaymentForm.ts, update incrementField:
const incrementField = useCallback((field: ...) => {
  setFormData((prev) => ({
    ...prev,
    [field]: Math.min(QUANTITY_LIMITS.max_per_item, (prev[field] as number) + 1),
  }));
}, []);
```

**Acceptance Criteria**:
- [ ] Cannot increment beyond 200 per item type
- [ ] Plus button disabled when at maximum
- [ ] Validation error shown if limit exceeded
- [ ] All quantity fields have consistent limit

---

## High Priority Issues

### 2. Add Direct Quantity Input

**Priority**: 🟠 HIGH
**Estimated Effort**: 4 hours
**Files to Modify**:
- `/frontend/src/features/annual-payments/components/QuantityInput.tsx`

**Issue**:
Users must click +/- buttons repeatedly for large quantities, which is tedious and poor UX.

**Solution**:
Enhance QuantityInput to include an editable number input:

```typescript
// In QuantityInput.tsx, add:
const [inputValue, setInputValue] = useState(value.toString());

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newValue = e.target.value;
  setInputValue(newValue);
};

const handleInputBlur = () => {
  const numValue = parseInt(inputValue, 10);
  if (!isNaN(numValue) && numValue >= 0 && numValue <= MAX_QUANTITY) {
    onValueChange(numValue); // New prop needed
  } else {
    setInputValue(value.toString()); // Reset to valid value
  }
};

// Replace the center span with:
<Input
  type="number"
  value={inputValue}
  onChange={handleInputChange}
  onBlur={handleInputBlur}
  className="w-16 text-center"
  min={0}
  max={MAX_QUANTITY}
/>
```

**Acceptance Criteria**:
- [ ] Can click/tap on number to edit directly
- [ ] Validates input (0-200 range)
- [ ] Resets to previous valid value if invalid input
- [ ] Works on mobile keyboards
- [ ] +/- buttons still functional

---

### 3. Add Debouncing to Rapid Increment/Decrement

**Priority**: 🟠 HIGH
**Estimated Effort**: 2 hours
**Files to Modify**:
- `/frontend/src/features/annual-payments/hooks/useAnnualPaymentForm.ts`

**Issue**:
Rapid clicking of +/- buttons could cause performance issues with many state updates and re-renders.

**Solution**:
```typescript
import { useState, useCallback, useMemo, useRef } from 'react';

export function useAnnualPaymentForm(initialValues?: Partial<AnnualPaymentFormData>) {
  const incrementTimeoutRef = useRef<NodeJS.Timeout>();

  const incrementField = useCallback((field: ...) => {
    // Clear existing timeout
    if (incrementTimeoutRef.current) {
      clearTimeout(incrementTimeoutRef.current);
    }

    // Optimistically update UI immediately
    setFormData((prev) => ({
      ...prev,
      [field]: Math.min(QUANTITY_LIMITS.max_per_item, (prev[field] as number) + 1),
    }));

    // Debounce validation/calculations
    incrementTimeoutRef.current = setTimeout(() => {
      // Any expensive operations here
    }, 300);
  }, []);

  // Similar for decrementField
}
```

**Acceptance Criteria**:
- [ ] UI updates immediately (no perceived lag)
- [ ] Validation/expensive calculations debounced
- [ ] No performance issues with rapid clicking
- [ ] Cleanup on unmount

---

### 4. Improve Validation Error Display

**Priority**: 🟠 HIGH
**Estimated Effort**: 2 hours
**Files to Modify**:
- `/frontend/src/features/annual-payments/data/schemas/annual-payment.schema.ts`
- `/frontend/src/features/annual-payments/components/PaymentSummary.tsx`

**Issue**:
The "at least one item must be selected" error is assigned to `include_club_fee` field, which is confusing. It should be a form-level error.

**Solution**:
```typescript
// In annual-payment.schema.ts:
.refine(
  (data) => { /* ... */ },
  {
    message: 'Debe seleccionar al menos un concepto de pago',
    path: [], // Empty path = form-level error
  }
);

// In PaymentSummary.tsx, add before submit button:
{errors._form && (
  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
    <p className="text-sm text-amber-600">{errors._form}</p>
  </div>
)}
```

**Alternative**: Show the error only when user attempts to submit with no items selected.

**Acceptance Criteria**:
- [ ] Error appears near submit button (not on club fee checkbox)
- [ ] Error is clear and actionable
- [ ] Error appears before submit attempt (real-time validation)
- [ ] Error disappears when user adds any item

---

## Medium Priority Issues

### 5. Add Permission Check to Navigation

**Priority**: 🟡 MEDIUM
**Estimated Effort**: 1 hour
**Files to Modify**:
- `/frontend/src/components/Sidebar.tsx`

**Issue**:
Sidebar shows "Pagos Anuales" link with only generic 'payments' resource check. Users might see link but get access denied.

**Solution**:
```typescript
// Add specific permission check:
{
  title: 'Pagos Anuales',
  path: '/annual-payments',
  icon: Receipt,
  resource: 'annual_payments', // More specific
  // Or add custom visibility check:
  visible: (userRole) => ['club_admin', 'association_admin'].includes(userRole)
},
```

**Acceptance Criteria**:
- [ ] Link only visible to authorized users
- [ ] Access denied page shown if direct URL access attempted without permission
- [ ] Consistent with other protected routes

---

### 6. Improve Club Dropdown Visual Feedback

**Priority**: 🟡 MEDIUM
**Estimated Effort**: 1 hour
**Files to Modify**:
- `/frontend/src/features/annual-payments/components/PayerDataSection.tsx`

**Issue**:
Club dropdown is disabled for club_admin users, but only has text explanation. Visual indicator would be clearer.

**Solution**:
```typescript
// Option 1: Add lock icon to disabled select
import { Lock } from 'lucide-react';

<div className="relative">
  <Select disabled={isClubAdmin}>
    {/* ... */}
  </Select>
  {isClubAdmin && (
    <Lock className="absolute right-10 top-3 h-4 w-4 text-slate-400" />
  )}
</div>

// Option 2: Use read-only input instead of disabled select
{isClubAdmin ? (
  <Input
    value={clubs.find(c => c.id === formData.club_id)?.name || ''}
    readOnly
    className="bg-slate-50"
  />
) : (
  <Select {...props} />
)}
```

**Acceptance Criteria**:
- [ ] Visual indicator when club is locked
- [ ] Maintains accessibility (screen reader friendly)
- [ ] Consistent with project design patterns

---

### 7. Add Basic Accessibility Features

**Priority**: 🟡 MEDIUM
**Estimated Effort**: 3 hours
**Files to Modify**:
- `/frontend/src/features/annual-payments/components/QuantityInput.tsx`
- `/frontend/src/features/annual-payments/components/PayerDataSection.tsx`
- `/frontend/src/features/annual-payments/components/PaymentSummary.tsx`

**Issue**:
Missing ARIA labels, keyboard navigation, and focus management.

**Solution**:
```typescript
// In QuantityInput.tsx:
<div role="group" aria-label={label}>
  <Button
    aria-label={`Disminuir ${label}`}
    {...props}
  />
  <span aria-live="polite" aria-atomic="true">
    {value}
  </span>
  <Button
    aria-label={`Aumentar ${label}`}
    {...props}
  />
</div>

// Add keyboard shortcuts:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target === inputRef.current) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onIncrement();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onDecrement();
      }
    }
  };
  // ... attach listener
}, []);
```

**Acceptance Criteria**:
- [ ] All interactive elements have ARIA labels
- [ ] Keyboard navigation works (Tab, Arrow keys)
- [ ] Screen reader announces changes
- [ ] Focus management on submit/error
- [ ] Passes basic WCAG 2.1 AA checks

---

### 8. Add Error Boundary

**Priority**: 🟡 MEDIUM
**Estimated Effort**: 2 hours
**Files to Create**:
- `/frontend/src/features/annual-payments/components/AnnualPaymentErrorBoundary.tsx`

**Issue**:
Component crashes are not handled gracefully, leading to blank screen.

**Solution**:
```typescript
// Create error boundary component
class AnnualPaymentErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Annual payment error:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2>Algo salió mal</h2>
          <p>Por favor, recarga la página e intenta de nuevo.</p>
          <Button onClick={() => window.location.reload()}>
            Recargar página
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrap in page:
<AnnualPaymentErrorBoundary>
  <AnnualPaymentProvider>
    <AnnualPaymentForm />
  </AnnualPaymentProvider>
</AnnualPaymentErrorBoundary>
```

**Acceptance Criteria**:
- [ ] Component crashes show user-friendly error message
- [ ] Errors logged for debugging
- [ ] User can recover (reload button)
- [ ] Does not affect other parts of app

---

## Test Coverage Requirements

### Unit Tests to Implement

**Priority**: 🟠 HIGH
**Estimated Effort**: 8 hours

1. **Schema Validation** (`annual-payment.schema.test.ts`)
   ```typescript
   describe('annualPaymentFormSchema', () => {
     it('should require payer_name', () => { /* ... */ });
     it('should require club_id', () => { /* ... */ });
     it('should require at least one item', () => { /* ... */ });
     it('should validate year range', () => { /* ... */ });
     it('should enforce quantity limits', () => { /* ... */ });
   });
   ```

2. **Form Hook** (`useAnnualPaymentForm.test.ts`)
   ```typescript
   describe('useAnnualPaymentForm', () => {
     it('should initialize with default values', () => { /* ... */ });
     it('should increment field value', () => { /* ... */ });
     it('should not exceed max limit', () => { /* ... */ });
     it('should calculate totals correctly', () => { /* ... */ });
     it('should validate form', () => { /* ... */ });
   });
   ```

3. **Components** (`QuantityInput.test.tsx`, etc.)
   ```typescript
   describe('QuantityInput', () => {
     it('should render with correct value', () => { /* ... */ });
     it('should disable minus button at 0', () => { /* ... */ });
     it('should call increment handler', () => { /* ... */ });
     it('should calculate total correctly', () => { /* ... */ });
   });
   ```

### Integration Tests

**Priority**: 🟡 MEDIUM
**Estimated Effort**: 4 hours

1. **Form Submission Flow**
   - Complete valid submission
   - Submission with validation errors
   - API error handling

2. **Context Provider**
   - Club filtering for club_admin
   - State propagation

### E2E Tests (Playwright)

**Priority**: 🟡 MEDIUM
**Estimated Effort**: 6 hours

1. Create test file: `frontend/e2e/annual-payments.spec.ts`
2. Implement scenarios from feedback report (Appendix)
3. Include happy path, validation path, and responsive tests

---

## Backend Verification Checklist

**Priority**: 🟠 HIGH
**Estimated Effort**: 2 hours

Review the following in backend code:

- [ ] Rate limiting on `/api/v1/payments/annual/initiate` endpoint
- [ ] Duplicate payment prevention (same club/year)
- [ ] Server-side amount validation (recalculate total)
- [ ] Authorization check (user can pay for selected club)
- [ ] Audit logging of payment attempts
- [ ] Transaction handling (payment + invoice creation)
- [ ] Error handling and proper HTTP status codes
- [ ] Input validation matches frontend (max quantities)

**Files to Review**:
- `/backend/src/application/use_cases/payment/initiate_annual_payment_use_case.py`
- `/backend/src/infrastructure/web/routers/payments.py`
- `/backend/src/infrastructure/adapters/repositories/mongodb_payment_repository.py`

---

## Manual Testing Checklist

**Priority**: 🟠 HIGH
**Estimated Effort**: 4 hours

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Responsive Testing
- [ ] Mobile: 375px (iPhone SE)
- [ ] Mobile: 414px (iPhone Pro Max)
- [ ] Tablet: 768px (iPad)
- [ ] Tablet: 1024px (iPad Pro)
- [ ] Desktop: 1280px
- [ ] Desktop: 1920px

### User Scenarios
- [ ] Club admin payment flow
- [ ] Association admin payment flow
- [ ] All validation scenarios
- [ ] Network error handling
- [ ] Session timeout during payment
- [ ] Back button after redirect

### Performance Testing
- [ ] Form loads in < 2 seconds
- [ ] No lag on quantity changes
- [ ] No console errors
- [ ] No memory leaks (long session)

---

## Documentation Updates Needed

**Priority**: 🟡 MEDIUM
**Estimated Effort**: 2 hours

1. **User Documentation**
   - [ ] Create user guide for annual payments
   - [ ] Add screenshots of each step
   - [ ] Document common errors and solutions

2. **Technical Documentation**
   - [ ] Update API documentation with annual payment endpoint
   - [ ] Document pricing constants and business rules
   - [ ] Add architecture diagram for payment flow

3. **Developer Documentation**
   - [ ] Update CLAUDE.md with annual payments feature info
   - [ ] Document testing approach
   - [ ] Add troubleshooting guide

---

## Timeline & Resource Allocation

### Phase 1: Critical Fixes (Required before deployment)
**Duration**: 1-2 days
**Resources**: 1 frontend developer
- [ ] Fix #1: Maximum quantity limits (2h)
- [ ] Fix #2: Direct input (4h)
- [ ] Fix #3: Debouncing (2h)
- [ ] Fix #4: Validation error display (2h)
- [ ] Backend verification (2h)
- [ ] Basic manual testing (4h)

### Phase 2: High Priority Improvements
**Duration**: 2-3 days
**Resources**: 1 frontend developer + 1 QA
- [ ] Medium priority fixes (#5-8) (7h)
- [ ] Unit test coverage (8h)
- [ ] Integration tests (4h)
- [ ] E2E tests (6h)
- [ ] Comprehensive manual testing (4h)

### Phase 3: Documentation & Polish
**Duration**: 1 day
**Resources**: 1 developer + 1 technical writer
- [ ] Documentation updates (2h)
- [ ] Final review (2h)
- [ ] Deployment preparation (2h)

**Total Estimated Effort**: 5-6 days
**Recommended Team**: 1 senior frontend dev + 1 QA + 1 technical writer

---

## Definition of Done

The Annual Payments feature is considered DONE when:

- [x] All acceptance criteria pass
- [ ] All CRITICAL issues resolved
- [ ] All HIGH priority issues resolved
- [ ] Minimum 80% unit test coverage
- [ ] Integration tests passing
- [ ] At least 1 E2E test covering happy path
- [ ] Manual testing completed on all major browsers
- [ ] Responsive design verified on mobile/tablet/desktop
- [ ] Backend security verification completed
- [ ] No console errors or warnings
- [ ] Accessibility baseline met (WCAG 2.1 Level A minimum)
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Stakeholder demo and approval
- [ ] Ready for production deployment

---

**Document Owner**: QA Team
**Last Updated**: 2026-01-30
**Next Review**: After Phase 1 completion

