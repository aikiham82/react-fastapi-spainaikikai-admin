# Phase 2: Oficialidad Payment Flow — Research

**Researched:** 2026-02-27
**Phase:** 02-oficialidad-payment-flow
**Requirements covered:** OFIC-01 through OFIC-09

---

## 1. What Already Exists (Reuse Map)

### 1.1 Redsys Infrastructure — Fully Reusable

The entire Redsys stack is already built and working for license/annual payments. Nothing new is needed at the infrastructure level.

| Component | Location | Status |
|-----------|----------|--------|
| `RedsysService` (3DES, HMAC-SHA256, signature) | `backend/src/infrastructure/adapters/services/redsys_service.py` | Ready |
| `RedsysServicePort` (abstract interface) | `backend/src/application/ports/redsys_service.py` | Ready |
| `RedsysPaymentRequest / FormData / NotificationData` | same port file | Ready |
| `InitiateRedsysPaymentUseCase` | `backend/src/application/use_cases/payment/initiate_redsys_payment_use_case.py` | Ready — **can be reused directly** |
| `ProcessRedsysWebhookUseCase` | `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py` | Ready — **needs seminar branch added** |
| Webhook router endpoint `POST /payments/webhook` | `backend/src/infrastructure/web/routers/payments.py` | Ready — no change needed |
| DI factory `get_process_redsys_webhook_use_case` | `backend/src/infrastructure/web/dependencies.py` line 366 | Ready — needs `seminar_repository` added |
| Frontend Redsys form-submit pattern | `frontend/src/features/annual-payments/hooks/mutations/useInitiateAnnualPayment.mutation.ts` | Copy pattern exactly |

### 1.2 Payment Domain — `PaymentType.SEMINAR` Already Exists

`backend/src/domain/entities/payment.py` already defines:

```python
class PaymentType(str, Enum):
    LICENSE = "license"
    ACCIDENT_INSURANCE = "accident_insurance"
    CIVIL_LIABILITY_INSURANCE = "civil_liability_insurance"
    ANNUAL_QUOTA = "annual_quota"
    SEMINAR = "seminar"   # <-- already there
```

`related_entity_id` on `Payment` is already designed for seminar_id (`# license_id, seminar_id, etc.`). No domain changes required.

The payment repository already has `find_by_club_type_year` and `find_by_member_type_year`. For the oficialidad 409 guard, we need `find_by_related_entity_id` on the payment repository (find an existing COMPLETED payment for this seminar_id + type SEMINAR). **This method does not currently exist and must be added.**

### 1.3 PriceConfiguration Domain — Needs One New Category

`backend/src/domain/entities/price_configuration.py`:

```python
VALID_CATEGORIES = {"license", "insurance", "club_fee"}  # must add "seminar"
```

Key/category to add: `category="seminar"`, `key="oficialidad_seminar"`.

The `__post_init__` validation only validates key format for `category == "license"`, so adding a new category with a free-form key requires:
1. Adding `"seminar"` to `VALID_CATEGORIES`
2. No other backend domain changes — the key can be any non-empty string for non-license categories

Frontend `PriceCategory` type in `frontend/src/features/price-configurations/data/schemas/price-configuration.schema.ts` needs `'seminar'` added to the union, and `PRICE_CATEGORY_LABELS` needs the label "Seminario" added.

The `PriceConfigurationForm` hardcodes `z.enum(['license', 'insurance', 'club_fee'])` for category — must add `'seminar'` there too.

### 1.4 Seminar Domain Entity — Needs `is_official` Field

`backend/src/domain/entities/seminar.py` currently has no oficialidad field. The `Seminar` dataclass must get:

```python
is_official: bool = False
```

Plus a domain method `mark_as_official()` for clarity. This field must propagate through:
- MongoDB repository (read/write)
- `SeminarResponse` DTO
- `SeminarMapper`
- Frontend `Seminar` interface and schema

**MongoDB migration required** (already noted in STATE.md blockers):
```js
db.seminars.update_many({"is_official": {"$exists": false}}, {"$set": {"is_official": false}})
```

### 1.5 Existing Webhook Handler — Where to Hook In

`ProcessRedsysWebhookUseCase.execute()` in `process_redsys_webhook_use_case.py` (lines 124–165) handles successful payments. The seminar oficialidad branch goes inside `if notification.is_successful:`, after `payment.complete_payment(...)`.

The use case already receives `seminar_repository` as optional (to be added). When `payment.payment_type == PaymentType.SEMINAR` and `payment.related_entity_id` is set, it calls `seminar_repository.find_by_id(payment.related_entity_id)`, sets `seminar.is_official = True`, saves.

**Idempotency:** The early-exit guard (OFIC-09) checks: if `seminar.is_official` is already `True` when the webhook arrives, skip the update silently and return success. This prevents double-updates from duplicate webhooks.

### 1.6 Frontend Seminar Components — What Needs Changing

- `SeminarList.tsx`: card has `<div className="aspect-video bg-muted">` with cover image — badge overlay goes here (position: absolute, z-10)
- The "Ver Detalles" inline Dialog also renders the cover image — badge overlay goes there too, plus a chip in the info section
- `useSeminarContext.tsx`: no mutation for oficialidad yet — new mutation needed
- `seminar.schema.ts`: `Seminar` interface needs `is_official: boolean`
- No dedicated seminar detail page exists — the detail is a `<Dialog>` inside `SeminarList`. The "Solicitar Oficialidad" button + pending state + success badge all live inside this Dialog.

### 1.7 Payment Return Flow — Current Pages

`/payment/success` auto-redirects to `/club-payments` after 10 seconds.
`/payment/failure` auto-redirects to `/annual-payments` after 30 seconds.

Per the CONTEXT decision, Redsys redirects back to the **seminar detail page** (not these generic pages). This means:
- The `ok_url` and `ko_url` passed to Redsys must point to `/seminars?seminar_id={id}&oficialidad_result=ok` (or similar) — the seminar list/detail page.
- The generic success/failure pages are NOT used for seminar payments.
- The seminar page detects the query param on load and shows the appropriate toast.

### 1.8 Payment Repository — Missing Method

`PaymentRepositoryPort` (`backend/src/application/ports/payment_repository.py`) does not have a method to look up a payment by `related_entity_id`. To enforce OFIC-08 (409 if already official), the simplest approach is to check `seminar.is_official` directly rather than querying the payment table, since that check is more reliable and already needed for OFIC-07. **No new repository method is strictly required** — the use case can just load the seminar and check `is_official`.

---

## 2. What Must Be Built (Gap Analysis)

### 2.1 Backend — New Components

| Component | Type | Notes |
|-----------|------|-------|
| `Seminar.is_official` field | Domain entity change | Default `False`, add `mark_as_official()` method |
| `SeminarAlreadyOfficialError` | Domain exception | New exception for 409 case |
| `"seminar"` category in `PriceConfiguration.VALID_CATEGORIES` | Domain entity change | One-liner addition |
| `InitiateSeminarOfficialidadUseCase` | New use case | Checks is_official → 409, fetches price from `PriceConfigurationRepo`, calls `InitiateRedsysPaymentUseCase` pattern |
| `GetSeminarOfficialidadPriceUseCase` | New use case (optional) | Or inline in initiate use case; needed to show price in modal |
| Seminar oficialidad webhook branch | Change to existing `ProcessRedsysWebhookUseCase` | Add SEMINAR payment type handling with idempotency guard |
| `seminar_repository` param in `ProcessRedsysWebhookUseCase.__init__` | Dependency injection change | Optional param, mirrors existing pattern |
| `SeminarResponse.is_official` field | DTO change | Add to Pydantic model |
| `SeminarMapper` update | Mapper change | Include `is_official` |
| `POST /seminars/{seminar_id}/oficialidad/initiate` | New router endpoint | Auth-gated (club admin), returns Redsys form data |
| `GET /seminars/oficialidad/price` | New router endpoint (optional) | Returns current oficialidad price for frontend modal |
| DI factory update for webhook use case | `dependencies.py` change | Add `seminar_repository=get_seminar_repository()` to factory at line 366 |
| New DI factories for iniciate_seminar_oficialidad_use_case | `dependencies.py` change | Follow existing `@lru_cache()` pattern |
| MongoDB migration script | Ops | `db.seminars.update_many(...)` as noted in STATE.md |

### 2.2 Frontend — New Components

| Component | Type | Notes |
|-----------|------|-------|
| `Seminar.is_official` in schema | Type change | Add to `Seminar` interface |
| `'seminar'` in `PriceCategory` union | Schema change | Plus `PRICE_CATEGORY_LABELS['seminar'] = 'Seminario'` |
| `PriceConfigurationForm` Zod enum update | Form change | Add `'seminar'` to category enum |
| `useInitiateSeminarOfficialidadMutation` | New mutation | Posts to new endpoint, submits Redsys form on success (same pattern as annual payment mutation) |
| `SolicitudOficialidadModal` | New component | `<Dialog>` with price display, explanation text, spinner Confirm button, inline error with aria-live |
| `OfficialBadge` | New component | Absolute-positioned pill, `z-10`, gold/amber color, icon + "Oficial" text, `aria-label` |
| `SeminarList.tsx` update | Component change | Add `OfficialBadge` overlay on card image; add "Solicitar Oficialidad" or "Procesando pago..." button in card footer for club admin |
| Detail dialog update | Component change | Add `OfficialBadge` on detail image + chip in info section; add "Solicitar Oficialidad" button (visible to club admin only, hidden if `is_official`) |
| Post-payment return handling | Page/hook change | Detect `?oficialidad_result=ok|cancelled&seminar_id=X` on seminars page; show appropriate toast; auto-refresh seminar detail |
| Polling or refetch logic | Hook change | After Redsys return with `ok`, poll `GET /seminars/{id}` until `is_official === true` (or seminar query invalidation) |
| `useSeminarContext.tsx` update | Context change | Add `initiateSeminarOfficialidad` action |

---

## 3. Architectural Decisions to Make Before Implementation

### 3.1 New Endpoint Design

**Option A — New dedicated router file** `backend/src/infrastructure/web/routers/seminar_oficialidad.py`
- Pro: Clean separation, no touching the seminars router which just had Phase 1 changes
- Con: Slight overhead (another file)

**Option B — Add endpoint to existing seminars router**
- Pro: All seminar endpoints in one place
- Con: seminars.py is already importing many dependencies

**Recommendation:** Option B — add to the existing seminars router. The endpoint is semantically about seminars. The pattern of adding new seminar endpoints there is already established.

### 3.2 Initiate Use Case Design

Two design options for `InitiateSeminarOfficialidadUseCase`:

**Option A — New standalone use case**
```python
class InitiateSeminarOfficialidadUseCase:
    def __init__(self, seminar_repo, payment_repo, price_config_repo, redsys_service):
        ...
    async def execute(self, seminar_id, club_id, success_url, failure_url, webhook_url):
        seminar = await seminar_repo.find_by_id(seminar_id)
        if seminar.is_official:
            raise SeminarAlreadyOfficialError(seminar_id)
        price_config = await price_config_repo.find_by_key("oficialidad_seminar")
        amount = price_config.price if price_config else 0.0
        # ... create Payment, generate Redsys form data directly
```

**Option B — Delegate to `InitiateRedsysPaymentUseCase`**
The existing use case takes `related_entity_id`, `payment_type`, `amount` — all we need. But the existing use case's only duplicate-check is `find_by_member_type_year` (for member payments). We'd need to add the `is_official` check before calling it.

**Recommendation:** Option A — new standalone use case. Cleaner, no risk of inadvertently triggering the member payment duplicate-check. The price fetch and is_official guard are all in one place.

### 3.3 Webhook Dispatch Pattern

The webhook use case currently handles all payment types in a single `execute()` method. Adding the seminar branch:

```python
# Inside if notification.is_successful:, after payment.complete_payment(...)
if payment.payment_type == PaymentType.SEMINAR and payment.related_entity_id:
    if self.seminar_repository:
        seminar = await self.seminar_repository.find_by_id(payment.related_entity_id)
        if seminar and not seminar.is_official:  # idempotency guard
            seminar.is_official = True  # or seminar.mark_as_official()
            await self.seminar_repository.update(seminar)
```

This goes before the `payment_repository.update(payment)` call (or immediately after — either is fine since they're independent operations).

### 3.4 Redsys Return URL for Seminars

The existing payment flow uses a **generic** `/payment/success` and `/payment/failure` page. For seminars, the CONTEXT decision requires returning to the seminar detail.

The approach:
- `ok_url = f"{frontend_url}/seminars?oficialidad=ok&seminar_id={seminar_id}"`
- `ko_url = f"{frontend_url}/seminars?oficialidad=cancelled&seminar_id={seminar_id}"`

On the seminars page, detect these params in a `useEffect` → show toast → open the detail for that seminar → start polling. The `seminar_id` param is needed to know which seminar to re-open/refresh.

**Note:** Redsys appends its own query params to the OK/KO URLs (`Ds_Order`, `Ds_Response`, etc.), so the frontend must handle both its own params and Redsys params coexisting.

### 3.5 Polling Strategy

The CONTEXT says: page polls or auto-refreshes until status updates.

**Recommended approach:** React Query's `refetchInterval`. After Redsys returns with `?oficialidad=ok`, set a flag in state → the seminar query for that specific seminar starts refetching every 2 seconds → when `is_official === true`, clear the flag, stop polling, show success toast.

```typescript
const { data: seminar } = useQuery({
  queryKey: ['seminars', seminarId],
  queryFn: () => seminarService.getSeminar(seminarId),
  refetchInterval: isPendingOfficialidad ? 2000 : false,
  // stop polling when official
  refetchIntervalInBackground: false,
});
```

Maximum polling duration: 30 seconds with a fallback "could not confirm" message.

### 3.6 Order ID Format for Seminar Payments

The existing `generate_order_id(payment_id)` uses last 4 timestamp digits + first 8 chars of payment_id (alphanumeric only). This is generic enough — no special format needed for seminars. The `payment_type` on the Payment entity is `SEMINAR` which already distinguishes them.

However, for debugging/idempotency purposes, using a recognizable prefix would help. Since Redsys order_id is stored as `payment.transaction_id`, and the webhook finds payment by `find_by_transaction_id(notification.order_id)`, the existing lookup mechanism works without any changes.

### 3.7 Idempotency Key Design (OFIC-09)

The idempotency guard for duplicate webhooks:
1. The webhook arrives with `order_id`
2. `find_by_transaction_id(order_id)` finds the Payment
3. **If `payment.status == COMPLETED` already** → the early exit: the seminar branch checks `seminar.is_official` and skips if already true
4. **If `payment.status == PROCESSING`** → normal first-time processing

The existing `complete_payment()` domain method raises `ValueError` if status != PROCESSING. This prevents double-completion at the domain level. The seminar `mark_as_official()` only sets the bool (idempotent). So the two-layer guard (Payment status guard + `is_official` bool guard) covers OFIC-09 completely.

---

## 4. Key Implementation Risks and Mitigations

### Risk 1: `ProcessRedsysWebhookUseCase` is `@lru_cache()` — singleton

The DI factory uses `@lru_cache()`, so the constructor is called once. Adding `seminar_repository` to the constructor is safe — it follows the same optional dependency injection pattern used for all other repos. **No risk**, just add the param.

### Risk 2: `PriceConfiguration` category validation will reject `"seminar"` currently

If a super admin creates the `oficialidad_seminar` price config before the code is deployed, it will fail. **Solution:** Deploy backend changes first, then seed the price config.

### Risk 3: `is_official` field absent in production MongoDB

All existing seminar documents lack `is_official`. The migration script (already in STATE.md blockers) must run before deploying or immediately after. Until it runs, Python's dataclass default `False` handles missing fields gracefully when Motor reads them (Motor returns `None` for missing fields, but the dataclass field has `= False` default, so the mapper must handle `None → False`).

**Verify the MongoDB mapper handles missing fields:** Check `mongodb_seminar_repository.py` to confirm it uses `doc.get("is_official", False)` or equivalent.

### Risk 4: Redsys `order_id` must start with 4 numeric chars and be max 12 chars

The existing `generate_order_id` already handles this correctly. No changes needed.

### Risk 5: Double-click "Confirmar" in modal submits twice

The CONTEXT already specifies `disabled={isLoading}` on the Confirm button. The backend 409 check (`seminar.is_official`) also catches this at the server level.

### Risk 6: Frontend `PaymentType` pollution — `PaymentType.SEMINAR` was designed for seminar registration fees, not oficialidad

The existing `PaymentType.SEMINAR` in the domain entity was designed for "seminar registration fee" (paying to attend). The oficialidad payment is also seminar-related but semantically different. Two options:
- **Reuse `PaymentType.SEMINAR`** with `related_entity_id = seminar_id` — differentiate by checking `seminar.is_official` after webhook
- **Add `PaymentType.SEMINAR_OFICIALIDAD`** — clearer intent, no ambiguity in webhook dispatch

**Recommendation:** Add `SEMINAR_OFICIALIDAD = "seminar_oficialidad"` to `PaymentType`. This makes the webhook dispatch unambiguous and prevents accidental collision if seminar registration payments are added in the future.

---

## 5. Data Flow Summary

### Happy Path: Club Admin Pays for Oficialidad

```
1. Club admin opens seminar detail dialog
2. Sees "Solicitar Oficialidad" button (is_official=False, owns the seminar)
3. Clicks button → SolicitudOficialidadModal opens
4. Modal fetches current price from GET /price-configurations (find by key="oficialidad_seminar")
5. Admin reviews price + explanation → clicks "Confirmar"
6. POST /api/v1/seminars/{id}/oficialidad/initiate
   → InitiateSeminarOfficialidadUseCase:
     a. find seminar → check is_official (raises 409 if true)
     b. find price config "oficialidad_seminar"
     c. create Payment(type=SEMINAR_OFICIALIDAD, related_entity_id=seminar_id, club_id=club_id)
     d. generate Redsys order_id
     e. return form data
7. Frontend modal spinner shows → resolves → JS form submitted → browser navigates to Redsys
8. Admin completes payment on Redsys
9. Redsys POSTs to POST /api/v1/payments/webhook (no auth)
   → ProcessRedsysWebhookUseCase:
     a. verify signature
     b. parse notification
     c. find payment by transaction_id
     d. complete_payment()
     e. SEMINAR_OFICIALIDAD branch: find seminar → if not is_official → mark_as_official() → save
     f. create invoice
     g. persist payment
10. Redsys redirects browser to /seminars?oficialidad=ok&seminar_id={id}
11. Frontend detects params → shows "Procesando pago..." state → starts polling GET /seminars/{id}
12. Polling detects is_official=True → stops → shows "¡Seminario oficial!" toast → badge appears
```

### 409 / Already Official Path

```
1. POST /api/v1/seminars/{id}/oficialidad/initiate
2. seminar.is_official == True → raises SeminarAlreadyOfficialError
3. Router maps to HTTP 409
4. Modal shows inline error "Este seminario ya es oficial"
```

### Duplicate Webhook Path

```
1. Redsys sends webhook twice for same order_id
2. First webhook: payment PROCESSING → completed → seminar marked official
3. Second webhook: find_by_transaction_id returns Payment with status=COMPLETED
   → complete_payment() raises ValueError (only PROCESSING can complete)
   → caught inside execute(), seminar branch: is_official already True → skip
   → returns WebhookProcessResult(success=True) → Redsys receives 200 OK
```

---

## 6. Frontend Architecture Notes

### Badge Component Design

Based on CONTEXT decision (corner overlay, top-right, icon + "Oficial" text, gold pill, z-10):

```tsx
// OfficialBadge.tsx
<div className="absolute top-2 right-2 z-10 flex items-center gap-1
                bg-amber-500 text-white text-xs font-semibold
                px-2 py-1 rounded-full shadow-sm"
     aria-label="Seminario oficial Spain Aikikai">
  <Award className="w-3 h-3" />
  <span>Oficial</span>
</div>
```

The parent image container needs `position: relative`. Currently `SeminarList.tsx` renders:
```tsx
<div className="aspect-video bg-muted">
```
Change to: `<div className="aspect-video bg-muted relative">` and place `{seminar.is_official && <OfficialBadge />}` inside.

Phase 3 can use `z-20` for its full seal overlay without conflict.

### "Solicitar Oficialidad" Button Visibility Rules

The button is visible when ALL of:
1. User is a club admin (`usePermissions` / `userRole === 'club_admin'`)
2. The seminar belongs to the user's club (`seminar.club_id === clubId`)
3. `seminar.is_official === false`
4. `seminar.status !== 'cancelled'` (optional guard, makes business sense)

When `oficialidad=ok` is detected in URL and `is_official` is still `false` (webhook not yet processed), show "Procesando pago..." disabled button with spinner.

### Mutation Pattern (mirrors existing annual payment mutation)

```typescript
export const useInitiateSeminarOfficialidadMutation = () => {
  return useMutation({
    mutationFn: (seminarId: string) => seminarService.initiateSeminarOfficialidad(seminarId),
    onSuccess: (response) => {
      // Submit Redsys form (same pattern as useInitiateAnnualPaymentMutation)
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = response.payment_url;
      // ... add hidden fields ...
      document.body.appendChild(form);
      form.submit();
    },
    onError: (error) => {
      // Error shown INSIDE modal (not toast) — return error to caller
    },
  });
};
```

The modal component catches the error and displays it inline using `role="alert"`.

---

## 7. Files to Create / Modify (Complete Inventory)

### Backend — New Files

- `backend/src/application/use_cases/seminar/initiate_seminar_oficialidad_use_case.py`

### Backend — Modified Files

- `backend/src/domain/entities/seminar.py` — add `is_official: bool = False`, `mark_as_official()` method
- `backend/src/domain/entities/price_configuration.py` — add `"seminar"` to `VALID_CATEGORIES`
- `backend/src/domain/exceptions/seminar.py` — add `SeminarAlreadyOfficialError`
- `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py` — add seminar branch + idempotency guard; add `seminar_repository` optional param
- `backend/src/infrastructure/web/routers/seminars.py` — add `POST /{seminar_id}/oficialidad/initiate` endpoint
- `backend/src/infrastructure/web/dto/seminar_dto.py` — add `is_official: bool = False` to `SeminarResponse`
- `backend/src/infrastructure/web/mappers_seminar.py` — map `is_official` field
- `backend/src/infrastructure/adapters/repositories/mongodb_seminar_repository.py` — read/write `is_official`
- `backend/src/infrastructure/web/dependencies.py` — add `get_initiate_seminar_oficialidad_use_case()`, update `get_process_redsys_webhook_use_case()` to include `seminar_repository`

### Frontend — New Files

- `frontend/src/features/seminars/components/OfficialBadge.tsx`
- `frontend/src/features/seminars/components/SolicitudOficialidadModal.tsx`
- `frontend/src/features/seminars/hooks/mutations/useInitiateSeminarOficialidad.mutation.ts`

### Frontend — Modified Files

- `frontend/src/features/seminars/data/schemas/seminar.schema.ts` — add `is_official: boolean`
- `frontend/src/features/seminars/data/services/seminar.service.ts` — add `initiateSeminarOfficialidad(seminarId)` function
- `frontend/src/features/seminars/components/SeminarList.tsx` — add badge overlay, "Solicitar Oficialidad" button, pending state, post-payment return handling
- `frontend/src/features/seminars/hooks/useSeminarContext.tsx` — add `initiateSeminarOfficialidad` action (or consume mutation directly in SeminarList)
- `frontend/src/features/price-configurations/data/schemas/price-configuration.schema.ts` — add `'seminar'` to `PriceCategory`, update `PRICE_CATEGORY_LABELS`
- `frontend/src/features/price-configurations/components/PriceConfigurationForm.tsx` — add `'seminar'` to category Zod enum and `<SelectItem>`

---

## 8. Outstanding Questions for Planning

1. **Does `GetSeminarOfficialidadPriceUseCase` need to be a separate use case?** Or should the frontend just call `GET /price-configurations` and filter by `key="oficialidad_seminar"` client-side? The latter reuses existing infrastructure with no new backend code. The frontend already has `usePriceConfigurationQueries` that fetches all configs.

2. **Should the `oficialidad/initiate` endpoint return the price in the response** so the frontend does not need a separate price-fetch call? This would mean the price is always fresh at initiation time. Likely yes — include `amount` in the response.

3. **Seminar detail page vs dialog:** Currently seminar detail lives inside a `<Dialog>` in `SeminarList.tsx`. The decision is whether the return URL `ok_url` should target the seminars list page with a query param, or if a new `/seminars/{id}` dedicated route should be created. The current architecture has no dedicated detail route. **Recommendation: stay with the list page + query param approach** to avoid the need for a new route and new page component. The `?oficialidad=ok&seminar_id=X` approach is simpler for Phase 2.

4. **Does `find_by_club_type_year` in the payment repository need updating?** For future duplicate checks, or is the `seminar.is_official` check sufficient? The `seminar.is_official` check is sufficient for OFIC-08.

---

## 9. Phase Sequencing Recommendation

This phase should be broken into these plans:

**Plan 02-01: Backend Domain + Price Config**
- Add `is_official` to Seminar entity + exception + mark_as_official method
- Add `"seminar"` category to PriceConfiguration
- Update MongoDB seminar repository
- Update DTO + mapper + SeminarResponse

**Plan 02-02: Backend Payment Flow**
- `InitiateSeminarOfficialidadUseCase`
- `POST /seminars/{id}/oficialidad/initiate` endpoint
- Update `ProcessRedsysWebhookUseCase` with seminar branch + idempotency
- Update DI factories in `dependencies.py`

**Plan 02-03: Frontend Badge + Price Config UI**
- `OfficialBadge` component
- Add badge to card + detail dialog
- Add `'seminar'` category to price configuration frontend
- Update `Seminar` interface with `is_official`

**Plan 02-04: Frontend Payment Flow**
- `SolicitudOficialidadModal`
- `useInitiateSeminarOfficialidadMutation`
- "Solicitar Oficialidad" button + pending state in SeminarList
- Post-payment return handling (query param detection, polling, toasts)

---

*Research completed: 2026-02-27*
*Phase: 02-oficialidad-payment-flow*
