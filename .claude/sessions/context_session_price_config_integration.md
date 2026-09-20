# Context Session: Price Configuration Integration with Annual Payments

## Feature Summary
Integrate `price-configurations` with `annual-payments` so prices come from the database instead of hardcoded values. Only `super_admin` can manage prices.

## Decisions Made (Brainstorming)
1. **Ampliar price-configurations**: Generalize the model to accept any payment concept (licenses + insurance + club fee), not just license combinations
2. **Error bloqueante**: If a price is not configured, block the payment initiation with a clear error
3. **Mostrar desglose**: Frontend fetches prices from backend and shows unit price × quantity before sending to Redsys

## Current State Analysis

### Price Configurations (isolated, not consumed by anything)
- **Entity**: `PriceConfiguration` with key format `grado-instructor-edad` (too restrictive)
- **Repository**: `MongoDBPriceConfigurationRepository` with `find_by_key()` already available
- **Router**: Full CRUD at `/api/v1/price-configurations`
- **Frontend**: Full feature at `/price-configurations` with form using 3-select dropdowns (grado/instructor/edad)
- **Permissions**: `super_admin` has full CRUD, `club_admin` has read-only (usePermissions.ts:22,33)
- **Backend auth**: No role enforcement on routes — only `get_auth_context` dependency (any authenticated user)

### Annual Payments (uses hardcoded prices)
- **Hardcoded prices**: `backend/src/config/annual_payment_prices.py` — dict with 7 items
- **Frontend prices**: `ANNUAL_PAYMENT_PRICES` constant in `annual-payment.schema.ts` — duplicated
- **InitiateAnnualPaymentUseCase**: Reads from `ANNUAL_PAYMENT_PRICES` dict
- **ProcessRedsysWebhookUseCase**: Also reads from `ANNUAL_PAYMENT_PRICES` (line 364)
- **Frontend components**: `ClubFeeSection`, `MemberFeesSection`, `InsuranceSection` all import `ANNUAL_PAYMENT_PRICES`

### Key Mapping (annual_payment item_type → price_configuration key)
| item_type | price_config key |
|---|---|
| `club_fee` | `club_fee` |
| `kyu` | `kyu-none-adulto` |
| `kyu_infantil` | `kyu-none-infantil` |
| `dan` | `dan-none-adulto` |
| `fukushidoin_shidoin` | `dan-fukushidoin_shidoin-adulto` |
| `seguro_accidentes` | `seguro_accidentes` |
| `seguro_rc` | `seguro_rc` |

## Design

### Task 1: Generalize PriceConfiguration entity
**Files to modify:**
- `backend/src/domain/entities/price_configuration.py`

**Changes:**
- Add `category: str` field with values: `"license"`, `"insurance"`, `"club_fee"`
- Keep `_validate_key_format()` only for `category == "license"`
- For other categories, just validate key is non-empty
- Add `VALID_CATEGORIES = {"license", "insurance", "club_fee"}`
- Validate category in `__post_init__`

### Task 2: Update repository and DTOs for category field
**Files to modify:**
- `backend/src/infrastructure/adapters/repositories/mongodb_price_configuration_repository.py` — add `category` to `_to_domain` and `_to_document`
- `backend/src/infrastructure/web/dto/price_configuration_dto.py` — add `category` field to Create/Update/Response DTOs
- `backend/src/application/ports/price_configuration_repository.py` — add `find_by_keys(keys: List[str])` method
- `mongodb_price_configuration_repository.py` — implement `find_by_keys`

### Task 3: Add annual-payment-prices endpoint + use case
**Files to create/modify:**
- Create `backend/src/application/use_cases/price_configuration/get_annual_payment_prices_use_case.py`
- Modify `backend/src/infrastructure/web/routers/price_configurations.py` — add `GET /annual-payment-prices`
- Modify `backend/src/infrastructure/web/dependencies.py` — wire new use case

**Endpoint:** `GET /api/v1/price-configurations/annual-payment-prices`
- Returns dict of 7 price configs needed for annual payments
- If any are missing/inactive, returns 422 with list of missing keys

### Task 4: Integrate InitiateAnnualPaymentUseCase with price repository
**Files to modify:**
- `backend/src/application/use_cases/payment/initiate_annual_payment_use_case.py`
- `backend/src/infrastructure/web/dependencies.py` (wire price_repo into payment use case)

**Changes:**
- Inject `PriceConfigurationRepositoryPort` into constructor
- Replace `ANNUAL_PAYMENT_PRICES[x]` lookups with `price_repo.find_by_key(mapped_key)`
- Add `PAYMENT_TYPE_TO_PRICE_KEY` mapping dict
- Raise `PriceNotConfiguredError` if any price is missing
- Keep `ANNUAL_PAYMENT_LABELS` from existing config for descriptions (or read from price_config.description)

### Task 5: Update ProcessRedsysWebhookUseCase
**Files to modify:**
- `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py`
- `backend/src/infrastructure/web/dependencies.py` (wire price_repo)

**Changes:**
- Inject `PriceConfigurationRepositoryPort`
- Replace `ANNUAL_PAYMENT_PRICES.get(ptype, 0.0)` with DB lookup
- Use same `PAYMENT_TYPE_TO_PRICE_KEY` mapping

### Task 6: Delete hardcoded prices file
**Files to delete:**
- `backend/src/config/annual_payment_prices.py`

Verify no remaining imports.

### Task 7: Frontend — fetch prices from API for annual-payments
**Files to modify:**
- `frontend/src/features/annual-payments/data/services/annual-payment.service.ts` — add `getAnnualPaymentPrices()`
- `frontend/src/features/annual-payments/data/schemas/annual-payment.schema.ts` — remove `ANNUAL_PAYMENT_PRICES` constant, add `AnnualPaymentPrices` type, update `calculateTotals` to accept dynamic prices
- `frontend/src/features/annual-payments/hooks/useAnnualPaymentContext.tsx` — fetch prices on mount, pass to components
- Add a query hook for fetching prices

### Task 8: Frontend — update components to use dynamic prices
**Files to modify:**
- `frontend/src/features/annual-payments/components/ClubFeeSection.tsx` — get price from context
- `frontend/src/features/annual-payments/components/MemberFeesSection.tsx` — get prices from context
- `frontend/src/features/annual-payments/components/InsuranceSection.tsx` — get prices from context
- `frontend/src/features/annual-payments/components/PaymentSummary.tsx` — use dynamic prices
- `frontend/src/features/annual-payments/components/QuantityInput.tsx` — no changes needed (already receives unitPrice as prop)

### Task 9: Frontend — update PriceConfigurationForm for generalized model
**Files to modify:**
- `frontend/src/features/price-configurations/components/PriceConfigurationForm.tsx` — support creating non-license prices (show key input instead of 3 dropdowns when category != "license")
- `frontend/src/features/price-configurations/data/schemas/price-configuration.schema.ts` — add `category` field
- `frontend/src/features/price-configurations/components/PriceConfigurationList.tsx` — show category badge

### Task 10: Permissions — restrict price-configurations to super_admin only
**Files to modify:**
- `backend/src/infrastructure/web/routers/price_configurations.py` — add `ctx.require_super_admin()` or check on write endpoints
- `frontend/src/core/hooks/usePermissions.ts` — remove `price_configurations: ['read']` from `club_admin` (was there already, need to verify sidebar visibility)
- `frontend/src/components/Sidebar.tsx` — verify Precios only shows for super_admin

### Task 11: Seed data — create initial price configurations in DB
**Files to create:**
- `backend/scripts/seed_price_configurations.py` — script to insert the 7 default prices

## Files Inventory
### Backend files touched:
- `backend/src/domain/entities/price_configuration.py`
- `backend/src/application/ports/price_configuration_repository.py`
- `backend/src/infrastructure/adapters/repositories/mongodb_price_configuration_repository.py`
- `backend/src/infrastructure/web/dto/price_configuration_dto.py`
- `backend/src/infrastructure/web/routers/price_configurations.py`
- `backend/src/infrastructure/web/dependencies.py`
- `backend/src/application/use_cases/payment/initiate_annual_payment_use_case.py`
- `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py`
- `backend/src/config/annual_payment_prices.py` (DELETE)
- NEW: `backend/src/application/use_cases/price_configuration/get_annual_payment_prices_use_case.py`
- NEW: `backend/scripts/seed_price_configurations.py`

### Frontend files touched:
- `frontend/src/features/annual-payments/data/schemas/annual-payment.schema.ts`
- `frontend/src/features/annual-payments/data/services/annual-payment.service.ts`
- `frontend/src/features/annual-payments/hooks/useAnnualPaymentContext.tsx`
- `frontend/src/features/annual-payments/components/ClubFeeSection.tsx`
- `frontend/src/features/annual-payments/components/MemberFeesSection.tsx`
- `frontend/src/features/annual-payments/components/InsuranceSection.tsx`
- `frontend/src/features/annual-payments/components/PaymentSummary.tsx`
- `frontend/src/features/price-configurations/components/PriceConfigurationForm.tsx`
- `frontend/src/features/price-configurations/data/schemas/price-configuration.schema.ts`
- `frontend/src/features/price-configurations/components/PriceConfigurationList.tsx`
- `frontend/src/core/hooks/usePermissions.ts`
- NEW: `frontend/src/features/annual-payments/hooks/queries/useAnnualPaymentPricesQuery.ts`

## Task 3 Status: Implementation Plan Complete

**Created by**: backend-developer subagent
**Date**: 2025-02-06
**Status**: Implementation plan ready

### Plan Location
Full implementation plan created at: `.claude/doc/price_config_integration/backend.md`

### Summary
Created detailed plan for new endpoint `GET /api/v1/price-configurations/annual-payment-prices` that:
- Returns 7 required price configurations for annual payment form
- Uses new `GetAnnualPaymentPricesUseCase`
- Validates all required prices are present and active
- Returns 422 with clear Spanish error if any prices missing
- Accessible to both super_admin and club_admin

### Key Implementation Details
1. **New use case**: `get_annual_payment_prices_use_case.py` - fetches and validates 7 prices
2. **Router modification**: Add endpoint BEFORE `/{price_id}` route (critical for path matching)
3. **Dependencies**: Add factory function with `@lru_cache()`
4. **Response format**: Dict mapping key → PriceConfigurationResponse DTO
5. **Error handling**: ValueError → 422 HTTP status with missing keys listed

### Prerequisites Verified
- ✅ PriceConfiguration entity has `category` field (Task 1)
- ✅ Repository has `find_by_keys()` method (Task 2)
- ✅ PriceConfigurationResponse DTO has `category` field (Task 2)

### Next Steps
Ready for implementation following the detailed plan in the documentation file.

## Implementation Status: ALL TASKS COMPLETE

### Tasks Completed:
1. ✅ **Task 1**: Generalized PriceConfiguration entity — added `category` field
2. ✅ **Task 2**: Updated repository, DTOs, port for category + `find_by_keys()`
3. ✅ **Task 3**: Added `GET /annual-payment-prices` endpoint + `GetAnnualPaymentPricesUseCase`
4. ✅ **Task 4**: Integrated `InitiateAnnualPaymentUseCase` with price repo
5. ✅ **Task 5**: Updated `ProcessRedsysWebhookUseCase` with price repo
6. ✅ **Task 6**: Deleted hardcoded prices file + created/ran seed script
7. ✅ **Task 7**: Frontend — fetch prices from API (query hook + service + context)
8. ✅ **Task 8**: Frontend — dynamic prices in ClubFeeSection, MemberFeesSection, InsuranceSection
9. ✅ **Task 9**: Frontend — PriceConfigurationForm supports category selection, list shows category badge
10. ✅ **Task 10**: Permissions — `require_super_admin()` on all CRUD routes, removed from club_admin frontend

### Verification:
- Backend tests: 387 passed, 2 skipped
- Frontend build: No errors in annual-payment or price-configuration files
- `annual-payment-prices` endpoint remains accessible to all authenticated users (club admins need it for payment form)

## QA Validation Status: PASSED (Code Review)

**Completed by**: qa-criteria-validator subagent
**Date**: 2026-02-06
**Method**: Comprehensive static code analysis

### Summary
All 13 acceptance criteria have been validated through detailed code review:
- ✅ Backend: 5/5 criteria passed
- ✅ Frontend: 8/8 criteria passed

### Key Findings
1. **Backend Implementation**: Correct
   - Price configurations endpoint returns 7 prices to authenticated users
   - All CRUD endpoints properly enforce super_admin role with `require_super_admin()`
   - InitiateAnnualPaymentUseCase and ProcessRedsysWebhookUseCase read prices from DB via repository
   - Hardcoded prices file successfully deleted
   - No remaining references to ANNUAL_PAYMENT_PRICES constant

2. **Frontend Implementation**: Correct
   - Annual payment form has loading state (spinner + message)
   - Annual payment form has error state (AlertTriangle + error message)
   - Dynamic prices fetched from API via useAnnualPaymentPricesQuery
   - Price config form supports 3 categories (license, insurance, club_fee)
   - License category shows 3 dropdown selectors (grado, instructor, edad)
   - Non-license categories show text input for custom key
   - Price config list displays category badge in both mobile and desktop views
   - "Precios" sidebar item correctly hidden for club_admin (no read permission in rolePermissions)

3. **Code Quality**: Excellent
   - Proper dependency injection throughout
   - Strong type safety (Pydantic + TypeScript + Zod)
   - Comprehensive error handling
   - Clean hexagonal architecture maintained
   - Good UX with loading/error states

### Limitations
- Runtime validation with Playwright not completed due to authentication issues
- Demo credentials (`admin@spainaikikai.es` / `admin123`) returned 401 Unauthorized
- Database appears to require authentication or demo users may not exist

### Recommendations
1. **Immediate**: Verify database seed script has been run
2. **Immediate**: Ensure demo user accounts exist with correct roles
3. **Short-term**: Perform manual testing checklist (see detailed report)
4. **Long-term**: Add automated E2E tests for permission scenarios

### Report Location
Full validation report: `.claude/doc/price_config_integration/feedback_report.md`

**Status**: ✅ Ready for production deployment (pending runtime validation)
