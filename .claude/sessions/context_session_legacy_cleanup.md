# Session: Legacy Code Cleanup

## Status: COMPLETED

## Summary
Removed all legacy code from the flat role system migration, abandoned features, and one-time scripts.

## Changes Made

### Commit 1: Database & File Cleanup (cce5c2c)
- Deleted `migration/scripts/` (10 one-time migration scripts)
- Deleted 5 outdated docs: BACKEND_FUNCIONAL_COMPLETO.md, BACKEND_IMPLEMENTACION_FINAL.md, IMPLEMENTACION_BACKEND_COMPLETA.md, PROGRESO_BACKEND.md, PLAN.md
- Deleted 3 symlinks: AGENTS.md, GEMINI.md, frontend-mobile
- Verified MongoDB `role` field already absent from users collection

### Commit 2: Backend Cleanup (1e84d08)
- **Deleted features**: News (8 files), Associations (10 files incl. exceptions & tests), Legacy Mappings (3 files)
- **Cleaned barrel exports**: entities/__init__, exceptions/__init__, ports/__init__, dto/__init__, routers/__init__, use_cases/__init__
- **Cleaned app.py**: Removed news/associations router imports and includes
- **Cleaned dependencies.py**: Removed news/association repos, use cases, `get_database` import
- **Cleaned conftest.py**: Removed association repository import/fixture, removed legacy `role` from test fixtures
- **Migrated 8 routers to AuthContext**: insurances, licenses, payments, seminars, invoices, import_export, member_payments, price_configurations, users
- **Removed legacy auth functions**: is_association_admin, is_club_admin (standalone), check_club_access, get_club_filter, require_association_admin, ROLE_* constants
- **Removed legacy fallbacks from AuthContext**: is_club_admin now returns False (not legacy role check), club_id returns None (not legacy field)
- **Removed User.role field**: entity, DTO, mapper, repository
- **Removed Club.association_id field**: entity, DTO, mapper, repository, create use case, clubs router endpoint
- Fixed conftest.py and 3 test files
- All 360 tests pass

### Commit 3: Frontend Cleanup (6d8c0f5)
- Deleted `frontend/src/core/components/` (duplicate ProtectedRoute & Shopy header + tests)
- Fixed import in home.page.tsx: `@/core/components/ProtectedRoute` → `@/components/ProtectedRoute`
- Deleted `frontend/src/features/news/` (entire frontend news feature, 16 files)
- Removed dead `/payments` case from Header.tsx
- Fixed payment pages: `navigate('/payments')` → `navigate('/annual-payments')`
- Removed `association_id` from club.schema.ts
- Vite build succeeds (2053 modules, bundle generated)
