# Task 3: Backend Implementation Plan - Annual Payment Prices Endpoint

## Overview

Create a dedicated endpoint and use case that returns the 7 price configurations needed for the annual payments form. This endpoint will be consumed by the frontend to display dynamic prices from the database instead of hardcoded values.

---

## Files to Create/Modify

### 1. CREATE: `backend/src/application/use_cases/price_configuration/get_annual_payment_prices_use_case.py`

**Purpose**: Use case that fetches and validates all 7 required price configurations for annual payments.

**Full Implementation**:

```python
"""Get Annual Payment Prices use case."""

from typing import Dict

from src.domain.entities.price_configuration import PriceConfiguration
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort


# These are the 7 keys that annual payments require
ANNUAL_PAYMENT_PRICE_KEYS = [
    "club_fee",              # category: club_fee
    "kyu-none-adulto",       # category: license
    "kyu-none-infantil",     # category: license
    "dan-none-adulto",       # category: license
    "dan-fukushidoin_shidoin-adulto",  # category: license
    "seguro_accidentes",     # category: insurance
    "seguro_rc",             # category: insurance
]


class GetAnnualPaymentPricesUseCase:
    """Use case for getting all price configurations needed for annual payments."""

    def __init__(self, price_repository: PriceConfigurationRepositoryPort):
        self.price_repository = price_repository

    async def execute(self) -> Dict[str, PriceConfiguration]:
        """Execute the use case.

        Returns:
            Dictionary mapping key -> PriceConfiguration for all 7 annual payment prices.

        Raises:
            ValueError: If any of the required price configurations are missing or inactive.
        """
        # Fetch all required price configurations in one query
        price_configs = await self.price_repository.find_by_keys(ANNUAL_PAYMENT_PRICE_KEYS)

        # Build dict with key as the dictionary key
        result = {config.key: config for config in price_configs}

        # Validate that all 7 keys are present
        found_keys = set(result.keys())
        expected_keys = set(ANNUAL_PAYMENT_PRICE_KEYS)
        missing_keys = expected_keys - found_keys

        if missing_keys:
            missing_list = ", ".join(sorted(missing_keys))
            raise ValueError(f"Faltan configuraciones de precios: {missing_list}")

        return result
```

**Key Design Decisions**:
- **Constants at module level**: `ANNUAL_PAYMENT_PRICE_KEYS` defined at the top for easy maintenance
- **Single query**: Uses `find_by_keys()` to fetch all prices in one database call (efficient)
- **Dictionary response**: Returns `Dict[str, PriceConfiguration]` for easy key-based access
- **Validation**: Checks that all 7 keys are present, raises `ValueError` with Spanish message if any missing
- **Error message in Spanish**: Matches the existing error patterns in the codebase for user-facing messages

**Testing Notes**:
- Test with all 7 configs present → should return dict with 7 items
- Test with 1 missing config → should raise ValueError with that key listed
- Test with multiple missing → should list all missing keys (comma-separated, sorted)
- Test with inactive config → should raise ValueError (since `find_by_keys` only returns active)

---

### 2. MODIFY: `backend/src/infrastructure/web/routers/price_configurations.py`

**Changes Required**:

Add the new endpoint **BEFORE line 85** (before the `/{price_id}` route) to avoid FastAPI path collision.

**Location**: Insert after the `/license-price` endpoint (after line 83) and before `/{price_id}`.

**Code to Add**:

```python
@router.get("/annual-payment-prices")
async def get_annual_payment_prices(
    get_prices_use_case = Depends(get_annual_payment_prices_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get all price configurations needed for annual payment form.

    Returns a dictionary with 7 price configurations:
    - club_fee
    - kyu-none-adulto
    - kyu-none-infantil
    - dan-none-adulto
    - dan-fukushidoin_shidoin-adulto
    - seguro_accidentes
    - seguro_rc

    Returns 422 if any required price configurations are missing.
    """
    try:
        prices_dict = await get_prices_use_case.execute()

        # Convert to response DTOs
        return {
            key: PriceConfigurationResponse(
                id=config.id,
                key=config.key,
                price=config.price,
                description=config.description,
                category=config.category,
                is_active=config.is_active,
                valid_from=config.valid_from,
                valid_until=config.valid_until,
                created_at=config.created_at,
                updated_at=config.updated_at
            )
            for key, config in prices_dict.items()
        }
    except ValueError as e:
        # Missing price configurations
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
```

**Import to Add** (at top of file, after existing imports from dependencies):

```python
from src.infrastructure.web.dependencies import (
    # ... existing imports ...
    get_annual_payment_prices_use_case  # ADD THIS
)
```

**Why This Location?**:
- FastAPI matches routes in order of definition
- `/{price_id}` is a catch-all path parameter that would match `/annual-payment-prices` if it came first
- By placing the specific path first, FastAPI correctly routes to the right endpoint

**Response Format**:

```json
{
  "club_fee": {
    "id": "507f1f77bcf86cd799439011",
    "key": "club_fee",
    "price": 100.0,
    "description": "Cuota de Club",
    "category": "club_fee",
    "is_active": true,
    "valid_from": null,
    "valid_until": null,
    "created_at": "2025-01-15T10:30:00",
    "updated_at": "2025-01-15T10:30:00"
  },
  "kyu-none-adulto": {
    "id": "507f1f77bcf86cd799439012",
    "key": "kyu-none-adulto",
    "price": 15.0,
    "description": "Licencia KYU (adulto)",
    "category": "license",
    "is_active": true,
    "valid_from": null,
    "valid_until": null,
    "created_at": "2025-01-15T10:30:00",
    "updated_at": "2025-01-15T10:30:00"
  },
  // ... 5 more items
}
```

**Error Response** (422 when missing prices):

```json
{
  "detail": "Faltan configuraciones de precios: club_fee, seguro_rc"
}
```

**Authentication**:
- Requires `get_auth_context` → any authenticated user (both `super_admin` and `club_admin`)
- This is intentional: both roles need access to the price data for the payment form
- Only write operations (create/update/delete) are restricted to `super_admin` (see Task 10 in overall plan)

---

### 3. MODIFY: `backend/src/infrastructure/web/dependencies.py`

**Changes Required**:

Add the factory function for the new use case.

**Location**: After the existing price configuration use case factories (around line 410-440 based on the structure).

**Code to Add**:

```python
@lru_cache()
def get_annual_payment_prices_use_case():
    """Get annual payment prices use case."""
    from src.application.use_cases.price_configuration.get_annual_payment_prices_use_case import GetAnnualPaymentPricesUseCase
    return GetAnnualPaymentPricesUseCase(get_price_configuration_repository())
```

**Pattern Explanation**:
- **`@lru_cache()`**: Ensures singleton pattern - one instance per application lifecycle
- **Lazy import**: Import inside function to avoid circular dependencies (existing pattern in this file)
- **Dependency injection**: Passes `get_price_configuration_repository()` which is already cached
- **Naming**: Follows convention `get_{use_case_name}_use_case`

**Where to Place**:
Look for this section in `dependencies.py`:

```python
# Price configuration repository and use cases
@lru_cache()
def get_price_configuration_repository() -> MongoDBPriceConfigurationRepository:
    """Get price configuration repository instance."""
    return MongoDBPriceConfigurationRepository()

@lru_cache()
def get_all_prices_use_case() -> GetAllPricesUseCase:
    """Get all prices use case."""
    return GetAllPricesUseCase(get_price_configuration_repository())

# ... other price config use cases ...
```

Add the new function **at the end** of this section, after all existing price configuration use case factories.

---

## Implementation Checklist

### Pre-Implementation
- [ ] Read context file: `.claude/sessions/context_session_price_config_integration.md`
- [ ] Verify Tasks 1 & 2 are complete (entity has `category` field, repository has `find_by_keys()`)
- [ ] Review existing price configuration use cases for patterns

### Implementation Steps
1. [ ] Create `get_annual_payment_prices_use_case.py` with the code above
2. [ ] Add the factory function in `dependencies.py`
3. [ ] Import the factory in `price_configurations.py` router
4. [ ] Add the `/annual-payment-prices` endpoint in the router (BEFORE `/{price_id}`)

### Verification Steps
- [ ] Check FastAPI automatic docs at `http://localhost:8000/docs` - the new endpoint should appear
- [ ] Test endpoint manually: `GET /api/v1/price-configurations/annual-payment-prices`
- [ ] Verify authentication required (401 without token)
- [ ] Test with missing price configs in DB (should return 422 with clear message)
- [ ] Test with all 7 configs present (should return dict with 7 items)

---

## Important Notes

### 1. Path Order in FastAPI
**CRITICAL**: The `/annual-payment-prices` route MUST be defined before `/{price_id}` route.

**Why**: FastAPI matches routes in the order they are defined. Path parameters like `{price_id}` are catch-all patterns. If `/{price_id}` comes first, a request to `/annual-payment-prices` would match it, treating "annual-payment-prices" as a price_id.

**Correct Order**:
```python
@router.get("")  # List all
@router.get("/license-price")  # Specific path
@router.get("/annual-payment-prices")  # Specific path - ADD HERE
@router.get("/{price_id}")  # Catch-all path parameter
```

### 2. Database Query Optimization
The use case uses `find_by_keys()` which performs a single MongoDB query with `$in` operator:

```python
db.price_configurations.find({"key": {"$in": [...7 keys...]}, "is_active": true})
```

This is much more efficient than 7 separate queries. The repository implementation already handles this correctly.

### 3. Error Handling Philosophy
- **ValueError with Spanish message**: User-facing error when prices are missing
- **422 status code**: Unprocessable Entity - the request is valid but the system state (missing prices) prevents processing
- **Comma-separated list**: Makes it easy for super_admin to see exactly which prices need to be configured

### 4. Authentication Strategy
This endpoint uses `get_auth_context` which means:
- ✅ Both `super_admin` and `club_admin` can access it
- ✅ Unauthenticated users get 401
- ❌ No role-specific logic needed here

**Rationale**: Club admins need to see prices when creating annual payments. Only the CRUD operations for managing prices should be restricted to super_admin.

### 5. Response Type
Returns `Dict[str, PriceConfigurationResponse]` where:
- **Key**: The price configuration key (e.g., "club_fee")
- **Value**: Full DTO with all fields including metadata (created_at, updated_at, etc.)

This structure makes frontend consumption easy:
```typescript
const prices = await getAnnualPaymentPrices();
const clubFeePrice = prices.club_fee.price;  // Direct access
```

### 6. MongoDB Datetime Handling
**IMPORTANT**: The codebase uses **naive datetimes** (not timezone-aware).

In the repository `_to_document()` method (already implemented):
```python
"updated_at": datetime.utcnow()  # ✅ Correct
# NOT datetime.now(timezone.utc)  # ❌ Wrong
```

This is already handled correctly in the existing repository code, but worth noting for consistency.

### 7. Integration with Existing Features
This endpoint is part of a larger feature chain:

1. **Super admin** uses `/price-configurations` CRUD to set up the 7 prices (Tasks 1-2)
2. **This endpoint** (Task 3) returns those prices for the payment form
3. **Frontend** (Tasks 7-8) fetches these prices and displays them in the form
4. **Payment use cases** (Tasks 4-5) use prices from DB during payment processing

### 8. Testing the Endpoint
Manual test with curl:

```bash
# 1. Get auth token
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@spainaikikai.es&password=admin123" \
  | jq -r '.access_token')

# 2. Test the endpoint
curl -X GET http://localhost:8000/api/v1/price-configurations/annual-payment-prices \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

Expected response: Dictionary with 7 price configurations.

### 9. Frontend Integration Preview
After this task, the frontend will call:

```typescript
// In annual-payment.service.ts
export const getAnnualPaymentPrices = async (): Promise<AnnualPaymentPrices> => {
  const response = await api.get('/price-configurations/annual-payment-prices');
  return response.data;
};
```

And the form components will use these dynamic prices instead of hardcoded constants.

### 10. Rollback Strategy
If this needs to be rolled back:
1. Remove the endpoint from `price_configurations.py`
2. Remove the import of `get_annual_payment_prices_use_case`
3. Remove the factory function from `dependencies.py`
4. Delete `get_annual_payment_prices_use_case.py`

No database changes needed (this is a read-only operation).

---

## Code Quality Notes

### Follows Hexagonal Architecture Principles
- ✅ **Domain layer**: Entity validation already in place (from Tasks 1-2)
- ✅ **Application layer**: Use case contains business logic (validation of required prices)
- ✅ **Infrastructure layer**: Repository handles MongoDB, router handles HTTP
- ✅ **Dependency injection**: Use case receives repository through constructor
- ✅ **Single responsibility**: Use case does one thing - fetch and validate annual payment prices

### Follows Project Conventions
- ✅ Use cases have single `execute()` method
- ✅ DTOs use Pydantic for validation
- ✅ Router is thin, delegates to use case
- ✅ Dependency injection with `@lru_cache()`
- ✅ Domain exceptions mapped to HTTP status codes
- ✅ Async/await throughout (Motor async driver)

### Error Handling Best Practices
- ✅ Specific exception type (`ValueError`)
- ✅ Clear error message in Spanish
- ✅ Appropriate HTTP status (422)
- ✅ Includes details of what's missing

---

## Dependencies Required

All dependencies already exist:
- ✅ `PriceConfiguration` entity (with `category` field from Task 1)
- ✅ `PriceConfigurationRepositoryPort` (with `find_by_keys()` from Task 2)
- ✅ `MongoDBPriceConfigurationRepository` (implements `find_by_keys()` from Task 2)
- ✅ `PriceConfigurationResponse` DTO (already has `category` field from Task 2)
- ✅ `get_auth_context` dependency
- ✅ `get_price_configuration_repository()` factory

---

## Next Steps (for other tasks)

After completing this task:
- **Task 4**: Update `InitiateAnnualPaymentUseCase` to use prices from DB (will call this use case)
- **Task 5**: Update `ProcessRedsysWebhookUseCase` to use prices from DB
- **Task 7**: Create frontend service method to call this endpoint
- **Task 8**: Update frontend components to use dynamic prices

---

## Summary

This task creates a dedicated endpoint that:
1. Returns exactly the 7 price configurations needed for annual payments
2. Validates all required prices are configured and active
3. Provides clear error messages if any are missing
4. Is accessible to both super_admin and club_admin (for the payment form)
5. Returns data in a frontend-friendly format (dictionary keyed by price key)
6. Follows all existing architecture patterns and conventions
7. Prepares the backend for the frontend integration in Tasks 7-8
