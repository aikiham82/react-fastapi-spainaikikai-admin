# Backend Implementation Plan: Enrich Members with club_name

## Overview
Add `club_name` enrichment to the `GET /members` endpoint (and related endpoints) to display which club each member belongs to. This follows the existing pattern of enriching members with `license_summary` and `insurance_summary`.

## Analysis

### Current State
- **Router**: `backend/src/infrastructure/web/routers/members.py`
  - `GET /members` (line 119-155): Returns `List[MemberResponse]`, already enriched with license/insurance summaries
  - `GET /members/{member_id}` (line 158-181): Returns single `MemberResponse`, also enriched
  - `GET /members/club/{club_id}` (line 184-197): Returns `List[MemberResponse]` for specific club

- **DTO**: `backend/src/infrastructure/web/dto/member_dto.py`
  - `MemberBase` (line 8-20): Has `club_id: Optional[str]` but NO `club_name` field
  - `MemberResponse` (line 95-108): Inherits from `MemberBase`, has `license_summary` and `insurance_summary` fields

- **Enrichment Pattern**: `_enrich_members_with_summaries()` (line 88-116)
  - Accepts list of `MemberResponse` objects
  - Extracts all member IDs
  - Batch-fetches licenses and insurances using `find_by_member_ids()`
  - Groups results by member_id using `defaultdict(list)`
  - Iterates through responses and sets summary fields
  - Returns enriched responses

- **Club Repository**: `backend/src/infrastructure/adapters/repositories/mongodb_club_repository.py`
  - `find_all(limit)`: Returns all clubs (line 62-65)
  - `find_by_id(club_id)`: Returns single club by ID (line 67-72)
  - **NO `find_by_ids()` method** - would need to use `find_all()` and filter, or add new method

- **Dependencies**: `backend/src/infrastructure/web/dependencies.py`
  - `get_club_repository()` already exists (line 120-122)
  - Uses `@lru_cache()` for singleton pattern

## Architectural Decisions

### 1. Should I create a new enrichment function `_enrich_members_with_club_names()`?

**RECOMMENDATION: YES - Create separate function for single responsibility**

**Rationale:**
- Follows single responsibility principle - each enrichment handles one concern
- Makes the code more maintainable - club enrichment can be modified independently
- Allows selective enrichment - some endpoints might not need club names in the future
- Consistent with hexagonal architecture - clear separation of concerns

**Pattern:**
```python
async def _enrich_members_with_club_names(
    responses: List[MemberResponse],
    club_repo,
) -> List[MemberResponse]:
    """Batch-enrich member responses with club names (1 query total)."""
```

**Alternative (NOT recommended):**
- Combining into `_enrich_members_with_summaries()` would mix concerns and violate SRP
- Would make the function name misleading (summaries != club names)

### 2. Should I inject `club_repository` as a dependency in the endpoint, or use `get_club_repository()` function?

**RECOMMENDATION: Inject as dependency via `Depends(get_club_repository)`**

**Rationale:**
- Consistent with existing pattern - `license_repo` and `insurance_repo` are injected via `Depends()`
- Follows dependency injection principle - dependencies are explicit in function signature
- Makes testing easier - can mock the repository in tests
- FastAPI's dependency injection handles caching via `@lru_cache()`

**Pattern:**
```python
@router.get("", response_model=List[MemberResponse])
async def get_members(
    # ... existing params ...
    license_repo = Depends(get_license_repository),
    insurance_repo = Depends(get_insurance_repository),
    club_repo = Depends(get_club_repository),  # ADD THIS
):
```

**Alternative (NOT recommended):**
- Calling `get_club_repository()` directly breaks DI pattern and makes testing harder

### 3. Does `MongoDBClubRepository` have a method to find multiple clubs by IDs?

**ANSWER: NO - Need to add `find_by_ids()` method**

**Current Methods:**
- `find_all(limit)`: Returns ALL clubs (inefficient if there are many clubs)
- `find_by_id(club_id)`: Returns ONE club (would require N queries for N clubs)

**RECOMMENDATION: Add `find_by_ids()` method to repository**

**Why:**
- **Efficiency**: Single database query with `$in` operator instead of N queries
- **Consistency**: Matches pattern from `MongoDBLicenseRepository.find_by_member_ids()` (line 114-122)
- **Scalability**: Works efficiently even with 100+ clubs
- **Best Practice**: Batch operations are standard for data enrichment

**Implementation Pattern (following license repository):**
```python
# In ClubRepositoryPort (application/ports/club_repository.py)
@abstractmethod
async def find_by_ids(self, club_ids: List[str], limit: int = 100) -> List[Club]:
    """Find clubs by a list of IDs."""
    pass

# In MongoDBClubRepository (infrastructure/adapters/repositories/mongodb_club_repository.py)
async def find_by_ids(self, club_ids: List[str], limit: int = 100) -> List[Club]:
    """Find clubs by a list of IDs."""
    if not club_ids:
        return []

    # Convert string IDs to ObjectId for query
    object_ids = []
    for club_id in club_ids:
        try:
            object_ids.append(ObjectId(club_id))
        except Exception:
            continue  # Skip invalid IDs

    if not object_ids:
        return []

    cursor = self.collection.find({"_id": {"$in": object_ids}})
    if limit > 0:
        cursor = cursor.limit(limit)
    documents = await cursor.to_list(length=limit if limit > 0 else None)
    return [self._to_domain(doc) for doc in documents]
```

**Alternative (NOT recommended):**
- Using `find_all()` and filtering in Python: Inefficient, loads all clubs into memory
- Multiple `find_by_id()` calls: N+1 query problem, very inefficient

### 4. Should I also enrich the `get_member` (single member) and `get_members_by_club` endpoints?

**RECOMMENDATION: YES - Enrich all endpoints that return `MemberResponse`**

**Rationale:**
- **Consistency**: All member responses should have the same shape
- **Frontend simplicity**: Components can always expect `club_name` to be present
- **API contract**: DTO defines the contract; all endpoints should honor it
- **Minimal overhead**: Single extra DB lookup per request (cached by club_id)

**Endpoints to enrich:**
1. `GET /members` (line 119-155) - PRIORITY 1 (main list)
2. `GET /members/{member_id}` (line 158-181) - PRIORITY 2 (detail view)
3. `GET /members/club/{club_id}` (line 184-197) - PRIORITY 3 (though club_name is redundant here)
4. `GET /members/search` (line 200-217) - PRIORITY 2 (search results)

**Special case for `get_members_by_club`:**
- Could skip enrichment since all members belong to the same club
- BUT recommend enriching for consistency - minimal overhead
- Alternative: Fetch the club once and set all members' `club_name` to the same value

## Implementation Plan

### Phase 1: Repository Layer (Domain Boundary)

**File**: `backend/src/application/ports/club_repository.py`
- Add abstract method `find_by_ids(club_ids: List[str], limit: int = 100) -> List[Club]`
- Location: After `find_by_id()` method (around line 21)

**File**: `backend/src/infrastructure/adapters/repositories/mongodb_club_repository.py`
- Implement `find_by_ids()` method
- Location: After `find_by_id()` method (around line 73)
- Use `{"_id": {"$in": object_ids}}` query pattern
- Handle ObjectId conversion with try/except (some IDs might be invalid)
- Follow exact pattern from `mongodb_license_repository.py` (line 114-122)

### Phase 2: DTO Layer (Web Boundary)

**File**: `backend/src/infrastructure/web/dto/member_dto.py`
- Add `club_name: Optional[str] = None` to `MemberResponse` class
- Location: After `club_id` field in `MemberBase` (around line 21), which `MemberResponse` inherits
- **IMPORTANT**: Add to `MemberBase`, not `MemberResponse`, so it's available in all member DTOs

**Updated `MemberBase`:**
```python
class MemberBase(BaseModel):
    """Base Member DTO."""
    first_name: str
    email: Optional[str] = None
    last_name: Optional[str] = None
    dni: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "Spain"
    club_id: Optional[str] = None
    club_name: Optional[str] = None  # ADD THIS
```

### Phase 3: Enrichment Logic (Web Layer)

**File**: `backend/src/infrastructure/web/routers/members.py`

**3a. Add enrichment function** (after `_enrich_members_with_summaries()`, around line 117)

```python
async def _enrich_members_with_club_names(
    responses: List[MemberResponse],
    club_repo,
) -> List[MemberResponse]:
    """Batch-enrich member responses with club names (1 query total)."""
    if not responses:
        return responses

    # Extract unique club_ids (filter out None values)
    club_ids = list({r.club_id for r in responses if r.club_id})

    if not club_ids:
        return responses

    # Batch-fetch clubs
    clubs = await club_repo.find_by_ids(club_ids, limit=len(club_ids))

    # Create club_id -> club_name mapping
    club_names = {club.id: club.name for club in clubs}

    # Enrich responses
    for resp in responses:
        if resp.club_id:
            resp.club_name = club_names.get(resp.club_id)

    return responses
```

**Key implementation notes:**
- Use set comprehension `{r.club_id for r in responses if r.club_id}` to get unique IDs
- Convert set to list for `find_by_ids()` parameter
- Filter out `None` values to avoid DB errors
- Use dict comprehension for O(1) lookup: `{club.id: club.name for club in clubs}`
- Handle missing clubs gracefully - `club_names.get(resp.club_id)` returns `None` if not found

**3b. Update endpoints** to inject `club_repo` and call enrichment function

#### Endpoint 1: `GET /members` (line 119-155)

**Before:**
```python
@router.get("", response_model=List[MemberResponse])
async def get_members(
    limit: int = 100,
    club_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    get_all_use_case = Depends(get_all_members_use_case),
    get_search_use_case = Depends(get_search_members_use_case),
    ctx: AuthContext = Depends(get_auth_context),
    license_repo = Depends(get_license_repository),
    insurance_repo = Depends(get_insurance_repository),
):
    # ... business logic ...
    responses = MemberMapper.to_response_list(members)
    return await _enrich_members_with_summaries(responses, license_repo, insurance_repo)
```

**After:**
```python
@router.get("", response_model=List[MemberResponse])
async def get_members(
    limit: int = 100,
    club_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    get_all_use_case = Depends(get_all_members_use_case),
    get_search_use_case = Depends(get_search_members_use_case),
    ctx: AuthContext = Depends(get_auth_context),
    license_repo = Depends(get_license_repository),
    insurance_repo = Depends(get_insurance_repository),
    club_repo = Depends(get_club_repository),  # ADD THIS
):
    # ... business logic (unchanged) ...
    responses = MemberMapper.to_response_list(members)
    responses = await _enrich_members_with_summaries(responses, license_repo, insurance_repo)
    return await _enrich_members_with_club_names(responses, club_repo)  # ADD THIS
```

#### Endpoint 2: `GET /members/{member_id}` (line 158-181)

**Changes:**
- Add `club_repo = Depends(get_club_repository)` parameter
- After existing enrichment: `enriched = await _enrich_members_with_club_names(enriched, club_repo)`

#### Endpoint 3: `GET /members/club/{club_id}` (line 184-197)

**Changes:**
- Add `club_repo = Depends(get_club_repository)` parameter
- After existing enrichment: `return await _enrich_members_with_club_names(responses, club_repo)`

**Note:** This endpoint is special because all members have the same club_id. Consider optimizing:
```python
# Alternative implementation for get_members_by_club
club = await club_repo.find_by_id(club_id)
club_name = club.name if club else None
for resp in responses:
    resp.club_name = club_name
```

#### Endpoint 4: `GET /members/search` (line 200-217)

**Changes:**
- Add `club_repo = Depends(get_club_repository)` parameter
- After existing enrichment: `return await _enrich_members_with_club_names(responses, club_repo)`

## Files to Modify

| File | Changes | Lines | Priority |
|------|---------|-------|----------|
| `backend/src/application/ports/club_repository.py` | Add `find_by_ids()` abstract method | ~21 | P0 |
| `backend/src/infrastructure/adapters/repositories/mongodb_club_repository.py` | Implement `find_by_ids()` method | ~73 | P0 |
| `backend/src/infrastructure/web/dto/member_dto.py` | Add `club_name: Optional[str] = None` to `MemberBase` | ~21 | P1 |
| `backend/src/infrastructure/web/routers/members.py` | Add `_enrich_members_with_club_names()` function | ~117 | P1 |
| `backend/src/infrastructure/web/routers/members.py` | Update `get_members()` endpoint | ~119-155 | P1 |
| `backend/src/infrastructure/web/routers/members.py` | Update `get_member()` endpoint | ~158-181 | P2 |
| `backend/src/infrastructure/web/routers/members.py` | Update `get_members_by_club()` endpoint | ~184-197 | P2 |
| `backend/src/infrastructure/web/routers/members.py` | Update `search_members()` endpoint | ~200-217 | P2 |

## Files NOT Modified

- Domain entities (`src/domain/entities/member.py`) - No changes needed, club enrichment is view-layer concern
- Use cases (`src/application/use_cases/members/`) - No changes needed, use cases return domain entities
- Mappers (`src/infrastructure/web/mappers_member.py`) - No changes needed, mapper copies fields from entity

## Important Implementation Notes

### 1. MongoDB ObjectId Handling
- Club IDs are stored as `ObjectId` in MongoDB (after migration 009)
- Must convert string IDs to `ObjectId` for queries
- Handle conversion errors gracefully (some IDs might be invalid)

```python
object_ids = []
for club_id in club_ids:
    try:
        object_ids.append(ObjectId(club_id))
    except Exception:
        continue  # Skip invalid IDs
```

### 2. Enrichment Order
- Enrich in this order: `license_summary` → `insurance_summary` → `club_name`
- Order doesn't matter functionally, but matches field order in DTO for readability

### 3. Null Safety
- Always check for `None` values before processing
- Use `if r.club_id` to filter out members without clubs
- Use `club_names.get(resp.club_id)` instead of `club_names[resp.club_id]` to avoid KeyError

### 4. Performance Considerations
- Single DB query per endpoint call (not per member)
- Query uses indexed `_id` field (fast lookup)
- Typical payload: 100 members × 10 unique clubs = 1 query with 10 results
- Negligible overhead compared to license/insurance enrichment

### 5. Error Handling
- If `find_by_ids()` fails, let it raise (consistent with existing enrichment pattern)
- If a club is not found, `club_name` will be `None` (acceptable - frontend should handle)
- Invalid ObjectIds are silently skipped (defensive programming)

### 6. Testing Implications
- Unit test `_enrich_members_with_club_names()` with mocked repository
- Test cases:
  - Empty responses list
  - Responses with no club_ids
  - Responses with some club_ids
  - Missing clubs (club not found in DB)
  - Invalid club_ids (ObjectId conversion fails)
- Integration test full endpoint with database

## API Contract Changes

### Before:
```json
{
  "id": "507f1f77bcf86cd799439011",
  "first_name": "John",
  "last_name": "Doe",
  "club_id": "507f191e810c19729de860ea",
  "license_summary": { ... },
  "insurance_summary": { ... }
}
```

### After:
```json
{
  "id": "507f1f77bcf86cd799439011",
  "first_name": "John",
  "last_name": "Doe",
  "club_id": "507f191e810c19729de860ea",
  "club_name": "Club Aikido Madrid",  // NEW FIELD
  "license_summary": { ... },
  "insurance_summary": { ... }
}
```

**Backward Compatibility:**
- ✅ Field is optional (`Optional[str] = None`)
- ✅ Existing clients can ignore the new field
- ✅ No breaking changes to existing endpoints

## Rollout Strategy

### Phase 1: Repository Layer (Safe)
1. Add abstract method to `ClubRepositoryPort`
2. Implement `find_by_ids()` in `MongoDBClubRepository`
3. Test repository method in isolation

### Phase 2: DTO Layer (Safe)
1. Add `club_name` field to `MemberBase`
2. Verify OpenAPI schema updates correctly

### Phase 3: Enrichment Logic (Low Risk)
1. Add `_enrich_members_with_club_names()` function (not called yet)
2. Test function with mock data

### Phase 4: Endpoint Updates (Production)
1. Update `GET /members` first (highest priority)
2. Update remaining endpoints
3. Monitor performance and error rates

## Alternative Approaches Considered

### Alternative 1: Fetch clubs in frontend
**Rejected because:**
- Violates API design principle (backend should provide complete data)
- Requires N+1 queries from frontend (inefficient)
- Breaks separation of concerns (frontend shouldn't join data)

### Alternative 2: Add club_name to Member entity
**Rejected because:**
- Violates domain-driven design (Member entity shouldn't duplicate Club data)
- Creates data denormalization issues (what if club name changes?)
- Enrichment is a view concern, not domain concern

### Alternative 3: Use GraphQL for selective field fetching
**Rejected because:**
- Over-engineering for this use case
- Would require major architecture change
- REST API is sufficient and consistent with existing patterns

## Summary of Recommendations

1. **YES** - Create separate `_enrich_members_with_club_names()` function (SRP)
2. **YES** - Inject `club_repo` via `Depends()` (DI pattern)
3. **YES** - Add `find_by_ids()` method to repository (efficiency)
4. **YES** - Enrich all endpoints that return `MemberResponse` (consistency)

This approach:
- ✅ Follows hexagonal architecture principles
- ✅ Maintains separation of concerns (domain vs. view)
- ✅ Uses efficient batch operations (single DB query)
- ✅ Follows existing enrichment patterns (consistency)
- ✅ Is backward compatible (optional field)
- ✅ Is testable (dependency injection)
- ✅ Is maintainable (single responsibility)

## Questions for Implementer

Before starting implementation, verify:
1. Is `club_name` always expected to be present, or can it be `None`? (Current: Optional)
2. Should we handle deleted clubs gracefully? (Current: Yes, returns `None`)
3. Should we cache club names across requests? (Current: No, repository is cached via `@lru_cache()`)
4. What should happen if a member has invalid `club_id`? (Current: `club_name` = `None`)

Proceed with implementation after confirming these assumptions are correct.
