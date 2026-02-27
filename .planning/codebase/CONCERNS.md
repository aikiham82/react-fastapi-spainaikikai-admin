# Codebase Concerns

**Analysis Date:** 2025-02-27

## Tech Debt

**Bare Exception Handling Throughout Repositories:**
- Issue: Multiple repository methods swallow all exceptions with bare `except Exception:` clauses, silently returning `None` or `False`
- Files: `backend/src/infrastructure/adapters/repositories/mongodb_price_configuration_repository.py:63,110,117`, `mongodb_invoice_repository.py:109,198,205`, `mongodb_seminar_repository.py:79,132,139`, `mongodb_member_repository.py:90,145,152`, `mongodb_user_repository.py:71,128,136`, `mongodb_license_repository.py:102,216,223`, `mongodb_insurance_repository.py:71,149,156`, `mongodb_club_repository.py:79,117,124`
- Impact: Database errors (connection failures, invalid IDs, permissions) are masked, making debugging difficult. Invalid ObjectId strings fail silently instead of raising proper exceptions.
- Fix approach: Replace bare `except Exception:` with specific exception handling (catch `InvalidId` separately from other DB errors). Log exceptions before returning fallback values. Consider propagating critical errors instead of swallowing them.

**Incomplete Payment Refund Integration:**
- Issue: Redsys refund flow is stubbed with TODO comment
- Files: `backend/src/application/use_cases/payment/refund_payment_use_case.py:25`
- Impact: Refund functionality marks payments as refunded in database but never actually calls Redsys API. Customers believe they're refunded while money isn't returned.
- Fix approach: Implement actual Redsys refund API call, handle refund response, validate refund status before marking payment as refunded.

**Hardcoded Retry URL in Webhook Processing:**
- Issue: Payment failure notifications use hardcoded example.com URL instead of configuration
- Files: `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py:328`
- Impact: Customers receive incorrect retry links in failure emails
- Fix approach: Load retry URL from configuration settings, validate URL format, test email template rendering

**Silent Error Suppression in Dashboard and List Endpoints:**
- Issue: Multiple routes catch exceptions and pass silently, returning incomplete data without logging
- Files: `backend/src/infrastructure/web/routers/dashboard.py:150,226,235,261`, `licenses.py:96`, `insurances.py:44,61`
- Impact: Dashboard metrics and member enrichment fail silently. Users see partial/incorrect data without knowing something failed.
- Fix approach: Add structured logging for caught exceptions, return meaningful error indicators instead of None, implement circuit breaker pattern for cascading failures

## Known Bugs

**N+1 Query Problem in Dashboard Endpoint:**
- Symptoms: Dashboard loads license/member/club data 6+ individual queries instead of batched queries
- Files: `backend/src/infrastructure/web/routers/dashboard.py:143-163` (5 licenses × 1 query each), `215-236` (3 payments × 2 queries each), `253-270` (2 licenses × 1 query each)
- Trigger: Access `/dashboard/stats` endpoint
- Workaround: None - performance degrades with dataset size
- Impact: Dashboard becomes slower as data grows. With 100+ licenses expiring soon and 100+ recent transactions, dashboard hits 10+ sequential DB queries instead of 2-3 batched queries.

**Async Exception Handling Issues:**
- Symptoms: `except Exception:` at line 336-338 in `process_redsys_webhook_use_case.py` silently swallows email service failures
- Files: `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py:336-338`
- Trigger: Email service throws exception during webhook processing
- Workaround: Check email logs manually, users don't receive payment status notifications
- Impact: Payment notifications silently fail without alerting administrators

**Member Name Extraction Null Safety:**
- Symptoms: Dashboard member name displays as "Desconocido" when member lookup fails, but no indication this is an error state
- Files: `backend/src/infrastructure/web/routers/dashboard.py:152,263` (falls back to "Desconocido" silently)
- Trigger: Member document is missing/deleted but license/payment still references it
- Workaround: None
- Impact: Users see "Unknown" in activity stream for deleted members, cannot troubleshoot data consistency issues

## Security Considerations

**No Input Validation on Import Data:**
- Risk: Excel import endpoints accept arbitrary data types and don't validate lengths, format, or content
- Files: `backend/src/infrastructure/web/routers/import_export.py:74-120` (member import), `payload parsing for payments/licenses/insurances`
- Current mitigation: Basic Pydantic DTO validation on request body, but individual field parsing uses loose `.get()` with defaults
- Recommendations:
  - Add explicit validation for email format, phone number format, DNI structure
  - Implement size limits on string fields (address, city, etc.)
  - Add rate limiting on import endpoints
  - Log all imports with user tracking for audit trail
  - Validate Excel data types before processing (don't trust openpyxl type detection)

**Bare Exception Catching Hides Security Errors:**
- Risk: Security-related exceptions (authentication, authorization, database permission errors) are caught and converted to silent failures
- Files: Multiple repository files listed in Tech Debt section
- Current mitigation: Auth middleware exists but lower-layer exceptions bypass it
- Recommendations: Distinguish between expected errors (not found) and unexpected errors (permission denied, connection failed). Log unexpected errors. Never swallow authentication/authorization exceptions.

**Excel Export Creates Files Without Access Control:**
- Risk: Export endpoints generate Excel files with no apparent access control beyond endpoint auth
- Files: `backend/src/infrastructure/web/routers/import_export.py:180-270` (export functions)
- Current mitigation: Routes depend on `get_auth_context` but no field-level filtering visible
- Recommendations:
  - Verify club-scoped exports only return that club's data
  - Audit what data is included in exports (sensitive fields like phone, address)
  - Implement audit logging for all exports
  - Add row-level security checks before streaming response

**Unvalidated DateTime Handling in Parsing:**
- Risk: Date parsing from Excel accepts multiple formats but doesn't validate year range or future dates
- Files: `backend/src/infrastructure/web/routers/import_export.py:44-56,91-102`
- Current mitigation: Try/except silently returns None for invalid dates
- Recommendations: Validate date ranges (birth dates can't be in future, licenses can't expire 100 years away), reject ambiguous date formats, log parse failures

## Performance Bottlenecks

**Dashboard Endpoint with Multiple Sequential Member Lookups:**
- Problem: `/dashboard/stats` performs 6-10 sequential `find_one()` queries for member/club enrichment
- Files: `backend/src/infrastructure/web/routers/dashboard.py:143-270`
- Cause: Loop over documents then fetch related data inside loop instead of batch loading
- Current approach: Returns first 5 licenses, 3 seminars, 3 activities - but fetches member details per item
- Improvement path:
  1. Collect all member_ids/club_ids from initial queries
  2. Batch fetch all members in one query using `find({_id: {$in: [...]}})`
  3. Build lookup map, enrich in memory
  4. Expected: 6 queries → 3 queries (and faster in real usage)

**Import/Export Member Lookups Not Batched:**
- Problem: `import_export.py:421-424` loops over members and fetches each by ID sequentially
- Files: `backend/src/infrastructure/web/routers/import_export.py:419-425` (insurance export), similar pattern in other exports
- Cause: Plain loop with individual `member_repo.find_by_id(mid)` calls
- Impact: Exporting 100 members triggers 100 separate DB queries
- Improvement path: Use `member_repo.find_by_ids([all_ids])` if method exists, or batch into chunks of 20

**Exception Overhead in Repository Methods:**
- Problem: Try/except on every `ObjectId()` conversion even when ID format is already validated
- Files: All repository `find_by_id()` methods, example: `mongodb_price_configuration_repository.py:59-64`
- Cause: Defensive coding catching `InvalidId` exception
- Impact: High-frequency lookups in loops pay exception handling overhead
- Improvement path: Validate ObjectId format once at API boundary, pass validated IDs to repositories. Remove try/except if validation guaranteed.

## Fragile Areas

**Dashboard Route - High Coupling to Direct DB Access:**
- Files: `backend/src/infrastructure/web/routers/dashboard.py`
- Why fragile:
  - No use case layer - directly uses MongoDB collections
  - Multiple hardcoded field names (`first_name`, `last_name`, `club_id`, etc.)
  - Duplicated member/club lookup logic across multiple loops
  - Changes to Member or Club schema break dashboard immediately
- Safe modification:
  - Create dedicated `GetDashboardStatsUseCase` with all queries
  - Add field mapping layer to handle schema changes
  - Add tests for each dashboard widget independently
- Test coverage: No dedicated tests for dashboard - only integration tests
- Risk level: HIGH - touching this breaks production dashboard

**Import/Export Routes - Manual Data Mapping:**
- Files: `backend/src/infrastructure/web/routers/import_export.py`
- Why fragile:
  - Lines 77-88: Loose column name mapping with fallbacks (`row.get('first_name') or row.get('Nombre')...`)
  - No validation that all required fields are present
  - Excel parsing uses bare `except:` blocks (line 251-252)
  - Different import paths for create vs upsert - code duplication
  - Locale-specific field names (Spanish) hardcoded
- Safe modification:
  - Create Excel schema validator using schema library
  - Extract column mapping to configuration
  - Add comprehensive field validation before entity creation
  - Write integration tests with real Excel files
- Test coverage: Minimal - only basic import tests
- Risk level: HIGH - bulk operations can corrupt data

**Redsys Webhook Handler - Complex State Transitions:**
- Files: `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py` (532 lines)
- Why fragile:
  - Complex invoice/license/insurance generation from payment (lines 300+)
  - Member payment assignment parsing from JSON string (line 356)
  - Priority-based club fee assignment logic (lines 361-396)
  - Multiple repos and services with optional parameters - hard to trace what happens when
  - No clear validation of preconditions before state changes
- Safe modification:
  - Add detailed logging at each state transition
  - Split into smaller, testable methods (currently 532 lines)
  - Add comprehensive precondition validation before creating child records
  - Create integration tests with real Redsys message payloads
- Test coverage: Moderate - basic webhook tests exist but edge cases untested
- Risk level: CRITICAL - payments can get stuck or double-charged

**Exception Handling Pattern - Inconsistent Across Codebase:**
- Files: All repository files, web routers
- Why fragile:
  - Some exceptions logged (logfire.py), some silently swallowed (repositories)
  - No consistent error response format
  - Different layers handle same error differently
  - Middleware catches some errors, routers catch others
- Safe modification:
  - Create application-wide exception handler middleware
  - Define exception hierarchy with clear handling rules
  - Add error code/ID to responses for user reporting
  - Implement structured logging for all exceptions
- Test coverage: Limited - error paths not thoroughly tested
- Risk level: MEDIUM - debugging production issues difficult

## Scaling Limits

**Dashboard Query Performance with Large Datasets:**
- Current capacity: Reasonable for <10k members, starts degrading at 50k+
- Limit: Each dashboard request can trigger 10-20 sequential queries. With 5 concurrent users, that's 50-100 queries/sec baseline
- Scaling path:
  1. Implement dashboard aggregation pipeline using MongoDB aggregation framework
  2. Add caching layer (Redis) for dashboard stats (refresh every 5 minutes)
  3. Split expiring licenses into separate async job, push results to cache

**Excel Import Memory Usage:**
- Current capacity: Fine for <10k rows (~50MB file)
- Limit: openpyxl loads entire workbook into memory. 100k rows = 500MB+ RAM
- Scaling path:
  1. Stream parse Excel using openpyxl in read mode with data_only=True
  2. Process rows in chunks of 500, commit after each chunk
  3. Implement batch insert with bulk operations

**Webhook Processing Under High Payment Volume:**
- Current capacity: Can handle ~100 webhook callbacks/minute
- Limit: Complex processing per webhook (invoice generation, license creation) blocks on synchronous operations
- Scaling path:
  1. Move license/insurance generation to async task queue (Celery/RQ)
  2. Webhook handler validates and queues job, returns immediately
  3. Implement webhook retry/idempotency tokens to handle duplicates

## Dependencies at Risk

**Motor (MongoDB async driver) without connection pooling tuning:**
- Risk: Default connection pool settings may not scale well with concurrent requests
- Impact: Under load, connection exhaustion leads to timeouts
- Current status: No visible pool size configuration in `database.py`
- Migration plan: Add `maxPoolSize` configuration, implement connection pool monitoring, consider migration to native async MongoDB driver if performance issues emerge

**Pydantic-AI (^0.8.1) - Pre-release dependency:**
- Risk: Major version changes (0.x releases) can break API
- Impact: Unexpected failures if dependency upgrades
- Current status: Used in backend but unclear where/how much
- Migration plan: Audit pydantic-ai usage, consider migrating to stable LLM integration if heavy dependency. Lock to specific version if critical.

**openpyxl (3.1.5) - No newer version lock:**
- Risk: New versions may change behavior or drop Python 3.11 support
- Impact: Import/export functionality breaks silently
- Current status: Caret lock `^3.1.5` allows up to 4.x
- Migration plan: Pin to `3.1.5` until thorough testing of new versions. Implement regression tests for Excel parsing.

## Missing Critical Features

**Audit Logging:**
- Problem: No audit trail for sensitive operations (payments, user creation, data imports)
- Blocks: Regulatory compliance, fraud investigation, troubleshooting data inconsistencies
- Impact: Cannot answer "who changed this data and when?"
- Recommendation: Implement audit logging middleware that captures user, timestamp, operation type, before/after values for all sensitive mutations

**Webhook Idempotency:**
- Problem: Redsys webhook handler doesn't check if payment already processed
- Blocks: Retry scenarios lead to duplicate processing, double-charging
- Impact: If webhook retries, could create duplicate invoices/licenses
- Recommendation: Implement idempotency key checking - verify `ds_signature + timestamp` hasn't been processed before

**Rate Limiting on Import Endpoints:**
- Problem: No protection against bulk abuse of import endpoints
- Blocks: User could DOS system by uploading 1000s of files
- Impact: Server overwhelmed, legitimate users can't import
- Recommendation: Add per-user rate limiting (e.g., 10 imports/hour), add file size limits, implement async processing with job queue

**Error Recovery for Failed Payments:**
- Problem: If payment processing fails partway through (e.g., license created but invoice fails), no rollback mechanism
- Blocks: Customers left in inconsistent state
- Impact: Manual intervention needed to fix orphaned records
- Recommendation: Implement transaction semantics (all-or-nothing), or implement compensating transactions that clean up partial state

## Test Coverage Gaps

**Dashboard Endpoint Not Tested for N+1 Queries:**
- What's not tested: Query count assertions, performance benchmarks for dashboard loads
- Files: `backend/tests/` - no dedicated dashboard tests
- Risk: N+1 problems won't be caught during development
- Priority: HIGH - dashboard is critical path
- Recommendation: Add test that counts queries, assert maximum of 5 queries for dashboard stats

**Import/Export Edge Cases:**
- What's not tested: Malformed Excel files, missing columns, Unicode handling, large files (>50MB), concurrent imports
- Files: `backend/tests/` - minimal import/export tests
- Risk: Users hit untested code paths in production
- Priority: MEDIUM - bulk operations risk data quality
- Recommendation: Add parametrized tests for various Excel formats, add tests for concurrent imports

**Webhook Idempotency:**
- What's not tested: Webhook retry scenarios, duplicate payment signatures, out-of-order webhook delivery
- Files: `backend/tests/` - webhook tests don't cover retries
- Risk: Duplicate processing on retry
- Priority: CRITICAL - affects payments
- Recommendation: Add tests that replay identical webhook payloads and verify idempotency

**Exception Handling in Repository Methods:**
- What's not tested: What exceptions are actually caught? What happens with network timeouts, permission errors, corrupted data?
- Files: All repository tests only test happy paths
- Risk: Error handling assumptions break under real DB failures
- Priority: MEDIUM
- Recommendation: Add chaos testing - simulate connection timeouts, invalid IDs, permission denied errors

**Authorization in Dashboard and Export Endpoints:**
- What's not tested: Club admins don't see other clubs' data, super admins see all data, proper filtering applied
- Files: `backend/tests/` - no tests for data visibility boundaries
- Risk: Data leakage between clubs
- Priority: CRITICAL - security
- Recommendation: Add parametrized tests for each role checking data boundaries

**Email Service Integration:**
- What's not tested: Email sending works, email templates render correctly, failure handling
- Files: No dedicated email tests
- Risk: Users don't receive notifications, template rendering breaks in production
- Priority: MEDIUM
- Recommendation: Add email service tests using mock SMTP or real integration testing against test email account

---

*Concerns audit: 2025-02-27*
