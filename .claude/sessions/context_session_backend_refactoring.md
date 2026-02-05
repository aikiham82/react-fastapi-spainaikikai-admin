# Backend Refactoring Session Context

## Overview
Refactoring the backend to implement clean DDD with:
1. Explicit User↔Member link
2. Role separation (global_role in User, club_role in Member)
3. License category field persistence
4. Removal of redundancies (License.club_id)
5. Centralized legacy data management

## Final Status: ✅ ALL PHASES COMPLETE - ALL TESTS PASSING

## Test Results
- **371 tests passed**
- **2 tests skipped**
- **0 failures**

## Implementation Status

### Phase 1: License Category Fields ✅ COMPLETE
- [x] Rename license entity fields to English (grado_tecnico → technical_grade, etc.)
- [x] Update repository to persist categories
- [x] Update DTOs
- [x] Update price_configuration
- [x] Create migration script (001_fix_license_categories.py)

### Phase 2: Member.club_role ✅ COMPLETE
- [x] Add ClubRole enum and field to Member
- [x] Update repository
- [x] Update DTOs and mappers
- [x] Create migration script (002_add_member_club_role.py)

### Phase 3: User.member_id + global_role ✅ COMPLETE
- [x] Add GlobalRole enum and member_id to User
- [x] Add validation for single SUPER_ADMIN
- [x] Update repository with find_by_member_id and find_by_global_role
- [x] Create migration script (003_link_users_to_members.py)

### Phase 4: Authorization Refactor ✅ COMPLETE
- [x] Create AuthContext dataclass
- [x] Add get_auth_context dependency
- [x] Create new AuthContext-based functions (check_club_access_ctx, etc.)
- [x] Keep legacy functions for backwards compatibility

### Phase 5: Remove License.club_id ✅ COMPLETE
- [x] Remove from entity
- [x] Refactor repository queries (find_by_club_id now uses member lookup)
- [x] Update DTOs and mappers
- [x] Create migration script (004_remove_license_club_id.py)
- [x] Update tests (removed club_id from all License tests)
- ⚠️ BREAKING CHANGE: Frontend needs to derive club_id from member

### Phase 6: Legacy Mappings Collection ✅ COMPLETE
- [x] Create LegacyMapping entity
- [x] Create LegacyMappingRepositoryPort
- [x] Create MongoDBLegacyMappingRepository
- [x] Create migration script (005_create_legacy_mappings.py)

### Phase 7: Remove User.club_id ✅ COMPLETE
- [x] Remove club_id from User entity
- [x] Update repository
- [x] Update DTOs
- [x] Update UserMapper (now uses global_role and member_id)
- [x] Create migration script (006_remove_user_club_id.py)
- [x] Update tests (test_user_dto.py - updated expected serialization)

## Files Modified

### Domain Layer
- `backend/src/domain/entities/license.py` - Renamed category fields, removed club_id
- `backend/src/domain/entities/member.py` - Added ClubRole enum and club_role field
- `backend/src/domain/entities/user.py` - Added GlobalRole enum, member_id, removed club_id
- `backend/src/domain/entities/price_configuration.py` - Updated key validation/generation
- `backend/src/domain/entities/legacy_mapping.py` - NEW
- `backend/src/domain/exceptions/user.py` - Added SuperAdminAlreadyExistsError
- `backend/src/domain/exceptions/price_configuration.py` - Updated parameter names

### Application Layer
- `backend/src/application/ports/repositories.py` - Added find_by_member_id, find_by_global_role
- `backend/src/application/ports/price_configuration_repository.py` - Updated parameter names
- `backend/src/application/ports/legacy_mapping_repository.py` - NEW
- `backend/src/application/use_cases/user_use_cases.py` - Added super_admin validation
- `backend/src/application/use_cases/price_configuration/get_license_price_use_case.py` - Updated parameter names

### Infrastructure Layer
- `backend/src/infrastructure/adapters/repositories/mongodb_license_repository.py` - Updated for category fields, find_by_club_id refactored
- `backend/src/infrastructure/adapters/repositories/mongodb_member_repository.py` - Added club_role handling
- `backend/src/infrastructure/adapters/repositories/mongodb_user_repository.py` - Added new methods, global_role handling
- `backend/src/infrastructure/adapters/repositories/mongodb_price_configuration_repository.py` - Updated parameter names
- `backend/src/infrastructure/adapters/repositories/mongodb_legacy_mapping_repository.py` - NEW
- `backend/src/infrastructure/web/authorization.py` - Added AuthContext and new functions
- `backend/src/infrastructure/web/dependencies.py` - Added get_auth_context
- `backend/src/infrastructure/web/dto/license_dto.py` - Added category fields, removed club_id
- `backend/src/infrastructure/web/dto/member_dto.py` - Added club_role
- `backend/src/infrastructure/web/dto/user_dto.py` - Added global_role, member_id, removed club_id
- `backend/src/infrastructure/web/dto/price_configuration_dto.py` - Updated parameter names
- `backend/src/infrastructure/web/mappers.py` - Updated UserMapper for global_role and member_id
- `backend/src/infrastructure/web/mappers_license.py` - Updated for category fields, removed club_id
- `backend/src/infrastructure/web/mappers_member.py` - Added club_role mapping
- `backend/src/infrastructure/web/routers/price_configurations.py` - Updated parameter names
- `backend/src/infrastructure/web/routers/members.py` - Updated imports for new auth functions

### Test Files Updated
- `backend/tests/domain/license/test_license_entity.py` - Removed club_id from all tests (11 tests)
- `backend/tests/infrastructure/web/test_user_dto.py` - Updated expected serialization for UserBase

### Migration Scripts
- `migration/scripts/001_fix_license_categories.py` - Rename license fields
- `migration/scripts/002_add_member_club_role.py` - Add club_role to members
- `migration/scripts/003_link_users_to_members.py` - Link users to members, add global_role
- `migration/scripts/004_remove_license_club_id.py` - Remove club_id from licenses
- `migration/scripts/005_create_legacy_mappings.py` - Create legacy_mappings collection
- `migration/scripts/006_remove_user_club_id.py` - Remove club_id from users

## Migration Order
Run migrations in order:
```bash
cd backend
poetry run python -m migration.scripts.001_fix_license_categories
poetry run python -m migration.scripts.002_add_member_club_role
poetry run python -m migration.scripts.003_link_users_to_members
poetry run python -m migration.scripts.004_remove_license_club_id
poetry run python -m migration.scripts.005_create_legacy_mappings
poetry run python -m migration.scripts.006_remove_user_club_id
```

## Notes
- All naming now uses English
- Legacy functions in authorization.py work for backwards compatibility
- Frontend updates required for License.club_id removal
- Single SUPER_ADMIN constraint enforced in code and via MongoDB partial unique index
