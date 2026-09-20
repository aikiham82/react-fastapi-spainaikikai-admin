# Technology Stack

**Analysis Date:** 2025-02-27

## Languages

**Primary:**
- Python 3.11+ - Backend application using FastAPI
- TypeScript 5.8 - Frontend application and type safety
- JavaScript (ES Module) - Build tooling and runtime

**Secondary:**
- HTML/CSS (TailwindCSS 4.x) - Styling and layout
- JSON - Configuration files

## Runtime

**Environment:**
- Node.js 18+ (Frontend development and build)
- Python 3.11+ with Poetry (Backend development and dependency management)
- Uvicorn 0.34.0 (ASGI server)

**Package Managers:**
- Poetry 1.x - Python dependency management
  - Lockfile: `poetry.lock` (present)
- npm/npm workspaces - Node.js package management
  - Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- FastAPI 0.115.6 - Backend REST API framework
- React 19.1.0 - Frontend UI library
- Vite 7.0.4 - Frontend build tool and dev server

**Database & ODM:**
- Motor 3.7.0 - Async MongoDB driver for Python
- PyMongo 4.10.1 - MongoDB Python client
- MongoDB 7 (Docker) - NoSQL database

**Testing:**
- pytest 8.3.5 - Python test runner
- pytest-asyncio 0.25.2 - Async test support for pytest
- pytest-cov 6.0.0 - Code coverage for pytest
- vitest 3.2.4 - Frontend unit test runner
- @testing-library/react 16.1.0 - React testing utilities

**Build/Dev:**
- @vitejs/plugin-react 4.6.0 - React support for Vite
- @tailwindcss/vite 4.1.11 - Tailwind CSS Vite plugin
- TypeScript 5.8.3 - Type checker for frontend
- ESLint 9.30.1 - Frontend linting
- typescript-eslint 8.35.1 - TypeScript linting support

## Key Dependencies

**Backend - Critical:**
- Pydantic 2.10.5 - Data validation and serialization
- python-jose 3.3.0 (with cryptography) - JWT token handling
- passlib 1.7.4 (with bcrypt) - Password hashing
- python-multipart 0.0.20 - Form data parsing

**Backend - Infrastructure:**
- email-validator 2.2.0 - Email validation
- aiosmtplib 5.0.0 - Async SMTP for email sending
- jinja2 3.1.6 - Email template rendering
- openpyxl 3.1.5 - Excel file generation
- reportlab 4.4.9 - PDF generation
- pillow 12.1.0 - Image processing
- pycryptodome 3.23.0 - Cryptography utilities (for Redsys payment encryption)
- python-dateutil 2.9.0.post0 - Date/time utilities

**Backend - Monitoring:**
- logfire 4.3.6 (with fastapi, redis, pymongo extras) - Observability and tracing
- opentelemetry-instrumentation-fastapi 0.57b0 - FastAPI instrumentation
- opentelemetry-instrumentation-pymongo 0.57b0 - MongoDB instrumentation
- pydantic-ai 0.8.1 - AI-powered features (optional)

**Frontend - Critical:**
- axios 1.10.0 - HTTP client
- @tanstack/react-query 5.84.2 - Data fetching and caching
- react-router-dom 7.7.0 - Routing and navigation
- react-hook-form 7.71.1 - Form state management
- zod 4.3.5 - Schema validation

**Frontend - UI Components:**
- @radix-ui/react-* (10+ packages) - Headless UI components
- lucide-react 0.525.0 - Icon library
- class-variance-authority 0.7.1 - Utility class composition
- clsx 2.1.1 - Conditional classname utility
- tailwind-merge 3.3.1 - Tailwind CSS merge utility
- cmdk 1.1.1 - Command menu component
- sonner 2.0.6 - Toast notifications
- next-themes 0.4.6 - Dark mode support

**Frontend - Data & Utilities:**
- date-fns 4.1.0 - Date manipulation
- xlsx 0.18.5 - Excel file handling
- @dnd-kit/* (3 packages) - Drag and drop functionality
- jwt-decode 4.0.0 - JWT token decoding

**Frontend - Testing:**
- @testing-library/dom 10.4.1 - DOM testing utilities
- @testing-library/jest-dom 6.6.3 - Jest-DOM matchers
- @testing-library/user-event 14.5.2 - User event simulation
- @vitest/coverage-v8 3.2.4 - Code coverage for vitest
- jsdom 26.0.0 - DOM implementation for Node.js

## Configuration

**Environment:**
- Loaded via `dotenv` from `.env` files (root, backend/, frontend/)
- Backend uses centralized settings classes: `AppSettings`, `RedsysSettings`, `EmailSettings`, `InvoiceSettings`
- Frontend uses Vite environment variables via `VITE_*` prefix

**Backend Config Files:**
- `backend/pyproject.toml` - Poetry dependencies, pytest configuration, coverage settings
- `backend/pytest.ini` - Test markers and configuration
- `backend/src/config/settings.py` - Centralized application settings

**Frontend Config Files:**
- `frontend/package.json` - npm scripts and dependencies
- `frontend/tsconfig.json` - TypeScript configuration with path aliases
- `frontend/tsconfig.app.json` - App-specific TypeScript settings
- `frontend/tsconfig.node.json` - Build tool TypeScript settings
- `frontend/vite.config.ts` - Vite build configuration with React plugin
- `frontend/tailwind.config.js` - TailwindCSS configuration

**Docker:**
- `docker-compose.yml` - Multi-service Docker setup
- `Dockerfile` (backend) - FastAPI application containerization
- `Dockerfile` (frontend) - React application containerization

## Platform Requirements

**Development:**
- Python 3.11+ (Backend)
- Node.js 18+ (Frontend)
- Docker & Docker Compose (for MongoDB)
- Git for version control

**Production:**
- Deployment target: Dokploy (Docker Compose compatible)
- MongoDB 7+ (containerized or managed service)
- FastAPI/Uvicorn application server
- Nginx or reverse proxy (for frontend serving)

**Optional Services:**
- OVH SMTP server (ssl0.ovh.net:465) for email
- Redsys payment gateway (test and production endpoints)
- Logfire service (optional observability)

---

*Stack analysis: 2025-02-27*
