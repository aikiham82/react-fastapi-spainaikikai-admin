# Context Session: Database Cleanup and Audit

## Overview
Implementing database schema cleanup after DDD refactoring to remove redundancies, fix inconsistencies, and optimize the MongoDB schema.

## Plan Summary
1. **Phase 1**: Code cleanup - Remove duplicate `is_active()` method in Insurance
2. **Phase 2**: Remove legacy fields from MongoDB (grado_tecnico, categoria_*, role)
3. **Phase 3**: Normalize club_id (remove from Insurance, MemberPayment) - **Note**: Kept on Payment and Invoice
4. **Phase 4**: Normalize Club._id to ObjectId
5. **Phase 5**: Create missing indexes
6. **Phase 6**: Update and run tests

## Final Status: ✅ COMPLETED

All phases completed successfully on 2026-02-05.

## Progress Log

### Phase 1: Code Cleanup ✅
- Removed duplicate `is_active()` method from Insurance entity (kept the @property version)
- File: `backend/src/domain/entities/insurance.py`

### Phase 2: Legacy Field Removal ✅
- Created migration script: `migration/scripts/007_cleanup_legacy_fields.py`
- Removes: `grado_tecnico`, `categoria_instructor`, `categoria_edad`, `license_type` from licenses
- Removes: `role` from users

### Phase 3a: Insurance club_id Removal ✅
- Removed `club_id` from Insurance entity
- Updated InsuranceRepositoryPort: replaced `find_by_club_id()` with `find_by_member_ids()`
- Updated MongoDBInsuranceRepository
- Updated GetAllInsurancesUseCase to inject MemberRepository
- Updated CreateInsuranceUseCase
- Updated InsuranceDTO, InsuranceMapper, insurances router
- Updated dependencies.py

### Phase 3b: Payment club_id - KEPT ✅
- **Decision**: Keep `club_id` on Payment entity
- **Reason**: Annual payments (ANNUAL_QUOTA) are club-level, not member-level

### Phase 3c: Invoice club_id - KEPT ✅
- **Decision**: Keep `club_id` on Invoice entity
- **Reason**: Derived from Payment.club_id for club-level invoices

### Phase 3d: MemberPayment club_id Removal ✅
- Removed `club_id` from MemberPayment entity
- Updated MemberPaymentRepositoryPort:
  - Replaced `find_by_club_year()` with `find_by_member_ids_year()`
  - Replaced `get_club_summary()` with `get_summary_by_member_ids()`
  - Removed `find_unpaid_by_club_year()`
- Updated MongoDBMemberPaymentRepository
- Updated GetClubPaymentSummaryUseCase and GetUnpaidMembersUseCase
- Updated process_redsys_webhook_use_case.py
- Updated member_payment_dto.py

### Phase 3e: Migration Script ✅
- Created: `migration/scripts/008_remove_club_id_from_entities.py`
- Removes `club_id` from insurances and member_payments collections
- Drops obsolete indexes

### Phase 4: Club._id Normalization ✅
- Created: `migration/scripts/009_normalize_club_ids.py`
- Converts all Club._id from string to ObjectId
- Updates references in: members, payments, invoices, seminars
- Simplified mongodb_club_repository.py (removed dual-query defensive code)

### Phase 5: Index Creation ✅
- Created: `migration/scripts/010_create_missing_indexes.py`
- Creates indexes:
  - `member_payments.member_id_1_payment_year_-1`
  - `member_payments.payment_id_1`
  - `member_payments.member_year_type_status`
  - `insurances.member_id_1`

### Phase 6: Test Updates ✅
- Fixed insurance entity tests (removed `club_id` parameter from all test fixtures)
- Fixed `is_active` property usage in tests (was being called as method)
- All 371 tests pass (2 skipped)

## Migration Scripts Created

| Script | Purpose |
|--------|---------|
| `007_cleanup_legacy_fields.py` | Remove Spanish legacy fields from licenses and role from users |
| `008_remove_club_id_from_entities.py` | Remove club_id from insurances and member_payments |
| `009_normalize_club_ids.py` | Convert Club._id to ObjectId |
| `010_create_missing_indexes.py` | Create performance indexes |

## Files Modified

### Domain Entities
- `backend/src/domain/entities/insurance.py` - Removed club_id, removed duplicate is_active()
- `backend/src/domain/entities/member_payment.py` - Removed club_id

### Repository Ports
- `backend/src/application/ports/insurance_repository.py` - Changed find_by_club_id to find_by_member_ids
- `backend/src/application/ports/member_payment_repository.py` - Major refactor to use member_ids

### Repository Implementations
- `backend/src/infrastructure/adapters/repositories/mongodb_insurance_repository.py`
- `backend/src/infrastructure/adapters/repositories/mongodb_member_payment_repository.py`
- `backend/src/infrastructure/adapters/repositories/mongodb_club_repository.py`

### Use Cases
- `backend/src/application/use_cases/insurance/get_all_insurances_use_case.py`
- `backend/src/application/use_cases/insurance/create_insurance_use_case.py`
- `backend/src/application/use_cases/member_payment/get_club_payment_summary_use_case.py`
- `backend/src/application/use_cases/member_payment/get_unpaid_members_use_case.py`
- `backend/src/application/use_cases/payment/process_redsys_webhook_use_case.py`

### DTOs and Mappers
- `backend/src/infrastructure/web/dto/insurance_dto.py`
- `backend/src/infrastructure/web/dto/member_payment_dto.py`
- `backend/src/infrastructure/web/mappers_insurance.py`

### Routers
- `backend/src/infrastructure/web/routers/insurances.py`
- `backend/src/infrastructure/web/routers/member_payments.py`

### Dependencies
- `backend/src/infrastructure/web/dependencies.py`

### Tests
- `backend/tests/domain/insurance/test_insurance_entity.py` - Removed club_id from fixtures

## Execution Order for Migration Scripts

1. Backup database first!
2. Run `007_cleanup_legacy_fields.py`
3. Deploy code changes
4. Run `008_remove_club_id_from_entities.py`
5. Run `009_normalize_club_ids.py`
6. Run `010_create_missing_indexes.py`

## Notes

- Payment and Invoice entities retain `club_id` because annual payments are club-level
- Club repository simplified after migration 009 runs
- All tests pass after changes
