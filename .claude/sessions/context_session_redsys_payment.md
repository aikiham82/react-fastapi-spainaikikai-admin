# Redsys Payment Gateway Implementation

## Overview
Implementation of Redsys payment gateway for federation license fee collection in martial arts club management system.

## Requirements Summary
- **License types**: 3 separate fields (TechnicalGrade: dan/kyu, InstructorCategory: none/fukushidoin/shidoin, AgeCategory: infantil/adulto)
- **Insurance**: Optional, separate purchase (NOT mandatory)
- **Prices**: Configurable from admin panel
- **Notifications**: Both email (30, 15, 7 days before expiry) AND dashboard alerts
- **Payment flow**: Only club admin can initiate payments
- **Invoices**: PDF downloadable with complete fiscal data
- **Credentials**: Production and test Redsys environments

## Implementation Progress

### Phase 1: Domain Layer (COMPLETED)
- [x] Updated License entity with new category fields (TechnicalGrade, InstructorCategory, AgeCategory)
- [x] Created PriceConfiguration entity
- [x] Created Invoice entity with InvoiceLineItem
- [x] Added domain exceptions (Redsys, PriceConfiguration, Invoice)

### Phase 2: Application Layer - Ports (COMPLETED)
- [x] Created PriceConfigurationRepositoryPort
- [x] Created InvoiceRepositoryPort
- [x] Created RedsysServicePort with DTOs
- [x] Created EmailServicePort with DTOs
- [x] Created PDFServicePort

### Phase 3: Infrastructure Layer (COMPLETED)
- [x] Created RedsysService (3DES encryption, HMAC-SHA256 signatures)
- [x] Created EmailService (aiosmtplib with Jinja2 templates)
- [x] Created PDFService (ReportLab for invoices and certificates)
- [x] Created MongoDBPriceConfigurationRepository
- [x] Created MongoDBInvoiceRepository

### Phase 4: Web Layer (COMPLETED)
- [x] Updated Payment use cases (InitiateRedsysPayment, ProcessRedsysWebhook)
- [x] Created PriceConfiguration use cases (CRUD + GetLicensePrice)
- [x] Created Invoice use cases (CRUD + PDF generation)
- [x] Updated Payment DTOs and router
- [x] Created PriceConfiguration DTOs and router
- [x] Created Invoice DTOs and router
- [x] Updated dependencies.py with all new services and use cases
- [x] Registered new routers in app.py

### Phase 5: Frontend (COMPLETED)
- [x] Created PriceConfigurationPage with full CRUD operations
- [x] Created InvoicesPage with PDF download and detail view
- [x] Added payment success/failure pages with Redsys error code handling
- [x] Updated Sidebar navigation with new menu items
- [x] Updated App.tsx with new routes
- [x] Updated usePermissions with new resource permissions

### Phase 6: Notifications (COMPLETED)
- [x] Created SendLicenseExpirationNotificationsUseCase (30, 15, 7 days before expiry)
- [x] Created NotificationScheduler with configurable daily run time
- [x] Integrated scheduler with FastAPI lifespan events
- [x] Created admin endpoint to manually trigger notifications

### Phase 7: Testing (IN PROGRESS)
- [ ] Backend unit tests
- [ ] Frontend tests
- [ ] Integration tests

### Phase 8: Playwright Testing (COMPLETED)
Results from manual UI testing using Playwright MCP:

**Issues Found & Fixed:**
1. Missing npm dependencies: `react-hook-form`, `@hookform/resolvers`, `zod`
   - Fixed by running `npm install react-hook-form @hookform/resolvers zod`
2. Missing `formatCurrency` export in price-configuration.schema.ts
   - Fixed by adding the function
3. Schema field mismatch between frontend components and backend API
   - Components used `grado_tecnico`, `base_price` but backend uses `key`, `price`
   - Fixed by updating components to use key parsing helpers

**Pages Tested (All Working):**
- [x] Login page - renders correctly
- [x] Registration flow - successfully creates users
- [x] Dashboard - loads with stats
- [x] Price Configurations page - empty state shows correctly
- [x] Invoices page - empty state shows correctly
- [x] Payment Success page - displays order ID from query params
- [x] Payment Failure page - translates Redsys error codes (e.g., 0190 → "Operacion denegada por el emisor")

**Known Issue (Resolved):**
- Sidebar navigation empty for newly registered users (no role assigned)
- Fixed by manually assigning `association_admin` role in MongoDB for testing
- Production should implement role assignment during user registration or admin assignment flow

**CRUD Operations Tested:**
- [x] Price Configuration CREATE - Created "dan-shidoin-adulto" at 150,00 €
- [x] Price Configuration READ - List displays with proper key parsing and currency formatting
- [x] Price Configuration UPDATE - Changed price from 150,00 € to 175,00 €
- [x] Invoices page - Empty state renders correctly
- [x] Payments page - Empty state with "Nuevo Pago" button renders correctly

**Final Screenshot:** `.playwright-mcp/playwright-testing-final.png`

## Key Files Created/Modified

### Backend Files
```
backend/src/config/settings.py - Redsys, Email, Invoice settings
backend/src/domain/entities/license.py - Updated with new category fields
backend/src/domain/entities/price_configuration.py - NEW
backend/src/domain/entities/invoice.py - NEW
backend/src/domain/exceptions/payment.py - Added Redsys exceptions
backend/src/domain/exceptions/price_configuration.py - NEW
backend/src/domain/exceptions/invoice.py - NEW
backend/src/application/ports/price_configuration_repository.py - NEW
backend/src/application/ports/invoice_repository.py - NEW
backend/src/application/ports/redsys_service.py - NEW
backend/src/application/ports/email_service.py - NEW
backend/src/application/ports/pdf_service.py - NEW
backend/src/infrastructure/adapters/services/redsys_service.py - NEW
backend/src/infrastructure/adapters/services/email_service.py - NEW
backend/src/infrastructure/adapters/services/pdf_service.py - NEW
backend/src/infrastructure/adapters/repositories/mongodb_price_configuration_repository.py - NEW
backend/src/infrastructure/adapters/repositories/mongodb_invoice_repository.py - NEW
backend/src/application/use_cases/price_configuration/*.py - NEW
backend/src/application/use_cases/invoice/*.py - NEW
backend/src/infrastructure/web/dto/payment_dto.py - Updated
backend/src/infrastructure/web/dto/price_configuration_dto.py - NEW
backend/src/infrastructure/web/dto/invoice_dto.py - NEW
backend/src/infrastructure/web/routers/payments.py - Updated
backend/src/infrastructure/web/routers/price_configurations.py - NEW
backend/src/infrastructure/web/routers/invoices.py - NEW
backend/src/infrastructure/web/dependencies.py - Updated
backend/src/app.py - Updated
```

## API Endpoints

### Payments
- `POST /api/v1/payments/initiate` - Initiate Redsys payment (returns form data)
- `POST /api/v1/payments/webhook` - Redsys webhook callback (no auth)
- `GET /api/v1/payments` - List payments
- `GET /api/v1/payments/{id}` - Get payment
- `PUT /api/v1/payments/{id}/refund` - Refund payment

### Price Configurations
- `GET /api/v1/price-configurations` - List all prices
- `GET /api/v1/price-configurations/license-price` - Get price for license type
- `GET /api/v1/price-configurations/{id}` - Get price config
- `POST /api/v1/price-configurations` - Create price config
- `PUT /api/v1/price-configurations/{id}` - Update price config
- `DELETE /api/v1/price-configurations/{id}` - Delete price config

### Invoices
- `GET /api/v1/invoices` - List invoices
- `GET /api/v1/invoices/member/{member_id}` - Get member invoices
- `GET /api/v1/invoices/{id}` - Get invoice
- `GET /api/v1/invoices/{id}/pdf` - Download invoice PDF
- `POST /api/v1/invoices/{id}/regenerate-pdf` - Regenerate PDF

## Price Configuration Key Format
Format: `{grado_tecnico}-{categoria_instructor}-{categoria_edad}`
Examples:
- `dan-shidoin-adulto`
- `kyu-none-infantil`
- `dan-fukushidoin-adulto`

## Redsys Integration
- Environment: Test (sis-t.redsys.es) / Production (sis.redsys.es)
- Encryption: 3DES CBC with zero IV
- Signature: HMAC-SHA256 with diversified key
- Order ID format: 4 numeric + alphanumeric (4-12 total)

## Next Steps
1. ~~Implement frontend payment flow~~ DONE
2. ~~Add price configuration admin UI~~ DONE
3. ~~Add invoice listing and PDF download~~ DONE
4. ~~Implement notification scheduler for license expiration~~ DONE
5. Add comprehensive test coverage (in progress)
6. End-to-end testing of the payment flow

## New Files Created (Phase 5-6)

### Frontend Files
```
frontend/src/features/price-configurations/
  hooks/usePriceConfigurationContext.tsx - Context provider for price configs
  components/PriceConfigurationList.tsx - List view with CRUD
  components/PriceConfigurationForm.tsx - Form for create/edit
  index.ts - Feature exports

frontend/src/features/invoices/
  hooks/useInvoiceContext.tsx - Context provider for invoices
  components/InvoiceList.tsx - List view with PDF download
  index.ts - Feature exports

frontend/src/pages/
  price-configurations.page.tsx - Price configuration admin page
  invoices.page.tsx - Invoices listing page
  payment-success.page.tsx - Payment success redirect page
  payment-failure.page.tsx - Payment failure redirect page

frontend/src/core/hooks/usePermissions.ts - Updated with invoices and price_configurations
frontend/src/components/Sidebar.tsx - Updated with new navigation items
frontend/src/App.tsx - Updated with new routes
```

### Backend Files
```
backend/src/application/use_cases/notification/
  __init__.py
  send_license_expiration_notifications_use_case.py - Main notification use case

backend/src/infrastructure/scheduler/
  __init__.py
  notification_scheduler.py - Background scheduler with factory function

backend/src/infrastructure/web/routers/
  notifications.py - Admin endpoints for notification management
```

## API Endpoints Added

### Notifications
- `POST /api/v1/notifications/send-expiration-reminders` - Manually trigger notifications (admin only)
- `GET /api/v1/notifications/scheduler-status` - Get scheduler status (admin only)

---

# Password Reset System Implementation (COMPLETED)

## Overview
Implementation of complete password recovery system for the federation management application.

## Problem
The "Olvidaste tu contrasena?" link in LoginForm.tsx pointed to `/forgot-password` but:
- No backend implementation existed
- No frontend pages existed

## Implementation Summary

### FASE 1: Backend Domain Layer (COMPLETED)
- Created `PasswordResetToken` entity with:
  - 24-hour expiration
  - One-time use validation
  - Cryptographically secure token generation (`secrets.token_urlsafe(32)`)
- Created domain exceptions:
  - `PasswordResetTokenNotFoundError`
  - `PasswordResetTokenExpiredError`
  - `PasswordResetTokenUsedError`
  - `InvalidPasswordResetTokenError`
  - `PasswordResetRateLimitError`

### FASE 2: Backend Application Layer (COMPLETED)
- Created `PasswordResetTokenRepositoryPort` with methods:
  - `find_by_token()`
  - `find_by_user_id()`
  - `create()`
  - `update()`
  - `invalidate_user_tokens()`
  - `delete_expired()`
  - `count_recent_requests()` - for rate limiting
- Created use cases:
  - `RequestPasswordResetUseCase` - generates token, sends email
  - `ResetPasswordUseCase` - validates token, updates password
  - `ValidateResetTokenUseCase` - checks token validity for frontend

### FASE 3: Backend Infrastructure Layer (COMPLETED)
- Created `MongoDBPasswordResetTokenRepository`
- Updated `EmailServicePort` with `send_password_reset_email()` method
- Updated `EmailService` with:
  - `PASSWORD_RESET_TEMPLATE` - HTML email template
  - `send_password_reset_email()` implementation

### FASE 4: Backend Web Layer (COMPLETED)
- Created DTOs:
  - `PasswordResetRequestDTO`
  - `PasswordResetRequestResponseDTO`
  - `ValidateTokenResponseDTO`
  - `ResetPasswordDTO`
  - `ResetPasswordResponseDTO`
- Created router with endpoints:
  - `POST /api/v1/auth/password-reset/request` - Request reset email
  - `GET /api/v1/auth/password-reset/validate/{token}` - Validate token
  - `POST /api/v1/auth/password-reset/reset` - Execute password reset
- Updated `dependencies.py` with factories
- Updated `app.py` to register router

### FASE 5: Frontend Feature (COMPLETED)
- Created `password-reset` feature:
  - `data/password-reset.schema.ts` - TypeScript interfaces
  - `data/password-reset.service.ts` - API client
  - `hooks/mutations/useRequestPasswordReset.mutation.ts`
  - `hooks/mutations/useResetPassword.mutation.ts`
  - `hooks/queries/useValidateToken.query.ts`
  - `components/ForgotPasswordForm.tsx`
  - `components/ResetPasswordForm.tsx`
  - `index.ts` - Feature exports

### FASE 6: Frontend Pages & Routing (COMPLETED)
- Created `forgot-password.page.tsx`
- Created `reset-password.page.tsx`
- Updated `App.tsx` with routes:
  - `/forgot-password`
  - `/reset-password`

## Security Features
- Token: `secrets.token_urlsafe(32)` (criptographically secure)
- Expiration: 24 hours
- One-time use: Token marked as used after successful reset
- Anti-enumeration: Always returns success message regardless of email existence
- Rate limiting: Max 5 requests per email per 24 hours
- Previous tokens invalidated when new one is created

## User Flow
1. Click "Olvidaste tu contrasena?" on login page → `/forgot-password`
2. Enter email → Backend generates token → Sends email
3. Click link in email → `/reset-password?token=xxx`
4. Enter new password → Token validated → Password updated
5. Redirect to login with success message

## Files Created

### Backend
```
backend/src/domain/entities/password_reset_token.py
backend/src/domain/exceptions/password_reset.py
backend/src/application/ports/password_reset_token_repository.py
backend/src/application/use_cases/password_reset/__init__.py
backend/src/application/use_cases/password_reset/request_password_reset_use_case.py
backend/src/application/use_cases/password_reset/reset_password_use_case.py
backend/src/infrastructure/adapters/repositories/mongodb_password_reset_token_repository.py
backend/src/infrastructure/web/dto/password_reset_dto.py
backend/src/infrastructure/web/routers/password_reset.py
```

### Frontend
```
frontend/src/features/password-reset/data/password-reset.schema.ts
frontend/src/features/password-reset/data/password-reset.service.ts
frontend/src/features/password-reset/hooks/mutations/useRequestPasswordReset.mutation.ts
frontend/src/features/password-reset/hooks/mutations/useResetPassword.mutation.ts
frontend/src/features/password-reset/hooks/queries/useValidateToken.query.ts
frontend/src/features/password-reset/components/ForgotPasswordForm.tsx
frontend/src/features/password-reset/components/ResetPasswordForm.tsx
frontend/src/features/password-reset/index.ts
frontend/src/pages/forgot-password.page.tsx
frontend/src/pages/reset-password.page.tsx
```

## Files Modified
- `backend/src/domain/entities/__init__.py` - Added PasswordResetToken export
- `backend/src/domain/exceptions/__init__.py` - Added password reset exceptions
- `backend/src/application/ports/__init__.py` - Added PasswordResetTokenRepositoryPort
- `backend/src/application/ports/email_service.py` - Added send_password_reset_email method
- `backend/src/infrastructure/adapters/services/email_service.py` - Added template and implementation
- `backend/src/infrastructure/web/dependencies.py` - Added factories for password reset
- `backend/src/app.py` - Registered password_reset_router
- `frontend/src/App.tsx` - Added routes for forgot-password and reset-password

## API Endpoints

### Password Reset
- `POST /api/v1/auth/password-reset/request` - Request password reset (public)
- `GET /api/v1/auth/password-reset/validate/{token}` - Validate token (public)
- `POST /api/v1/auth/password-reset/reset` - Reset password (public)

---

# Email Service - Dual Provider Configuration (COMPLETED)

## Overview
Implemented dual email provider strategy with OVH SMTP as primary and Resend as backup/fallback.

## Provider Configuration

### Primary: OVH SMTP
- Host: `ssl0.ovh.net`
- Port: `465` (SSL)
- User: `web@spainaikikai.org`
- Connection: SMTP_SSL (direct SSL on port 465)

### Backup: Resend
- API Key configured
- Uses `onboarding@resend.dev` as from address for unverified domains
- Automatically falls back if OVH SMTP fails

## Implementation Details

### EmailSettings (`backend/src/config/settings.py`)
```python
@dataclass
class EmailSettings:
    # Primary provider: OVH SMTP
    smtp_host: str = "ssl0.ovh.net"
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_use_ssl: bool = True

    # Backup provider: Resend
    resend_api_key: str = ""

    # Common settings
    from_email: str = ""
    from_name: str = "Spain Aikikai"

    @property
    def is_smtp_configured(self) -> bool
    @property
    def is_resend_configured(self) -> bool
    @property
    def is_configured(self) -> bool  # True if either provider configured
```

### EmailService (`backend/src/infrastructure/adapters/services/email_service.py`)
- `send_email()`: Tries OVH first, falls back to Resend
- `_send_via_smtp()`: SMTP_SSL for port 465, STARTTLS for port 587
- `_send_via_resend()`: Resend SDK integration
- Full MIME support with attachments
- HTML and plain text email support

### Environment Variables (`.env`)
```
# Primary: OVH SMTP
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_USER=web@spainaikikai.org
SMTP_PASSWORD=<pending>
SMTP_USE_SSL=true

# Backup: Resend
RESEND_API_KEY=re_XpyzzJ2T_JZwm8DScwGww9LsUwTp9GXVK

# Common
EMAIL_FROM_ADDRESS=web@spainaikikai.org
EMAIL_FROM_NAME=Spain Aikikai
```

## Pending Action
- **User needs to add OVH SMTP password** to `.env` file (`SMTP_PASSWORD=xxx`)
- Once password is added, OVH will be used as primary provider
- Until then, Resend is used as the only available provider
