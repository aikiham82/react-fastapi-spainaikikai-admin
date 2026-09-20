# External Integrations

**Analysis Date:** 2025-02-27

## APIs & External Services

**Payment Processing:**
- Redsys (Spanish payment gateway)
  - SDK/Client: Custom implementation via `pycryptodome` for 3DES encryption and HMAC-SHA256 signing
  - Integration: `src/infrastructure/adapters/services/redsys_service.py`
  - Auth: `REDSYS_MERCHANT_CODE`, `REDSYS_SECRET_KEY` (env vars)
  - Endpoints:
    - Test: `https://sis-t.redsys.es:25443/sis/realizarPago`
    - Production: `https://sis.redsys.es/sis/realizarPago`
  - Supports: Payment requests, payment notifications (webhooks), refunds
  - Response codes: Comprehensive mapping in `src/infrastructure/adapters/services/redsys_service.py` (76+ codes)

## Data Storage

**Databases:**
- MongoDB 7
  - Connection: `MONGODB_URL` (env var, format: `mongodb://user:pass@host:port/database`)
  - Database name: `spainaikikai`
  - Client: Motor (async) via `motor.motor_asyncio.AsyncIOMotorClient`
  - Implementation: `src/infrastructure/database.py`
  - Collections: users, clubs, members, licenses, seminars, payments, insurances, invoices, price_configurations, member_payments, password_reset_tokens, notifications
  - ORM/Query Layer: Direct Motor async queries (no ORM, repository pattern with hexagonal architecture)

**File Storage:**
- Local filesystem only (no cloud storage)
  - Invoice PDFs: Configurable output directory via `INVOICE_OUTPUT_DIR` env var
  - License images: Handled by `src/infrastructure/adapters/services/license_image_service.py`
  - Generated files stored locally, served via backend routes

**Caching:**
- None detected (no Redis or cache layer)
- React Query handles client-side caching with `staleTime: 0, gcTime: 0` (immediate invalidation)

## Authentication & Identity

**Auth Provider:**
- Custom implementation (no external OAuth provider)
  - Framework: OAuth2 with JWT tokens via python-jose
  - Password hashing: bcrypt via passlib
  - Token expiration: Configurable via `ACCESS_TOKEN_EXPIRE_MINUTES` (default 30)
  - Algorithm: HS256 (configurable via `JWT_ALGORITHM` env var)
  - Storage: JWT in `access_token` localStorage (frontend) or HTTP-only cookies

**Implementation:**
- Backend: `src/infrastructure/web/dependencies.py` - JWT validation, user context extraction
- Frontend: `src/core/data/apiClient.ts` - Token retrieval and Bearer header injection
- Password reset: `src/infrastructure/web/routers/password_reset.py` - Reset token generation and validation

## Monitoring & Observability

**Error Tracking & Monitoring:**
- Logfire (optional, if `LOGFIRE_TOKEN` env var is set)
  - Implementation: `src/config/logfire.py`
  - Service name: Configurable via `SERVICE_NAME` env var (defaults to 'fast-react-boilerplate')
  - Instrumentation includes:
    - FastAPI routes and middleware
    - PyMongo database operations
    - Pydantic data validation
    - OpenAI API calls (if used)
    - MCP (if used)
  - Distributed tracing: Currently disabled (`distributed_tracing=False`)
  - Scrubbing: Currently disabled (`scrubbing=False`)

**Logs:**
- Backend: Python logging module (configured in app setup)
  - Logfire integration when token is available
  - Console output for development
- Frontend: Browser console (dev tools)
  - No dedicated logging framework configured
- Docker: Container logs via `docker logs` command

## CI/CD & Deployment

**Hosting:**
- Dokploy (Docker Compose compatible deployment platform)
- Self-hosted option: Any Docker-compatible infrastructure

**CI Pipeline:**
- Not detected (no GitHub Actions, GitLab CI, or Jenkins config)
- Manual deployment via Dokploy or `docker-compose up`

**Containerization:**
- Docker images built from `backend/Dockerfile` and `frontend/Dockerfile`
- Multi-stage builds for optimization
- Health checks configured in docker-compose for both backend (HTTP) and MongoDB (mongosh ping)

## Environment Configuration

**Required env vars (Backend):**
- `MONGODB_URL` - MongoDB connection string
- `DATABASE_NAME` - Database name (e.g., 'spainaikikai')
- `JWT_SECRET_KEY` or `SECRET_KEY` - JWT signing secret
- `REDSYS_MERCHANT_CODE` - Redsys merchant identifier
- `REDSYS_SECRET_KEY` - Redsys signing key
- `EMAIL_FROM_ADDRESS` - Sender email address
- `SMTP_PASSWORD` - OVH SMTP password

**Optional env vars (Backend):**
- `ENVIRONMENT` - 'development' or 'production'
- `SERVICE_NAME` - Logfire service name
- `LOGFIRE_TOKEN` - Logfire observability token
- `JWT_ALGORITHM` - JWT signing algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration (default: 30)
- `REDSYS_ENVIRONMENT` - 'test' or 'production'
- `REDSYS_TERMINAL` - Redsys terminal ID (default: 1)
- `REDSYS_CURRENCY` - Currency code (default: 978 for EUR)
- `SMTP_HOST` - SMTP server host (default: ssl0.ovh.net)
- `SMTP_PORT` - SMTP server port (default: 465)
- `SMTP_USER` - SMTP username
- `SMTP_USE_SSL` - Use SSL for SMTP (default: true)
- `EMAIL_FROM_NAME` - Sender display name
- `INVOICE_COMPANY_NAME` - Company name for invoices
- `INVOICE_COMPANY_ADDRESS` - Company address for invoices
- `INVOICE_COMPANY_TAX_ID` - Tax ID for invoices
- `INVOICE_LOGO_PATH` - Path to company logo for invoices
- `INVOICE_TAX_RATE` - Tax rate for invoices (default: 0.0)
- `INVOICE_OUTPUT_DIR` - Directory for generated invoices
- `FRONTEND_BASE_URL` - Frontend URL for CORS and links
- `BACKEND_BASE_URL` - Backend URL for frontend API calls
- `OPENAI_API_KEY` - OpenAI API key (if using pydantic-ai)

**Required env vars (Frontend):**
- `VITE_API_URL` - Backend API URL (e.g., 'http://127.0.0.1:8000')

**Secrets location:**
- Environment variables (`.env` files not committed to git)
- Docker Compose passes via environment section
- Dokploy: Environment variables in deployment configuration

## Webhooks & Callbacks

**Incoming Webhooks:**
- Redsys payment notifications
  - Endpoint: `POST /api/v1/payments/notify` (inferred from Redsys service)
  - Payload: Base64-encoded merchant parameters + HMAC-SHA256 signature
  - Verification: Signature validation against merchant secret
  - Handler: `src/infrastructure/web/routers/payments.py`
  - Processing: Updates payment status in database

**Outgoing Webhooks:**
- None detected

**Callbacks:**
- Email notifications (asynchronous via aiosmtplib):
  - Payment confirmation emails
  - License expiration reminders
  - Password reset emails
  - Invoice delivery emails
  - Payment failure notifications
- Scheduler-based notifications:
  - License expiration checks: `src/infrastructure/scheduler.py`
  - Triggered at application startup and run periodically

---

*Integration audit: 2025-02-27*
