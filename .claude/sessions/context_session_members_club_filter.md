# Session Context: Members Club Filter Feature

## Feature Description
Super admin should be able to filter members by club and see which club each member belongs to.

## Brainstorming Decisions
1. **Club filter UI**: Combobox with search (Popover + Command pattern from shadcn/ui)
2. **Club display in table**: Clickable text that auto-filters by that club
3. **Club admin behavior**: Hide club filter AND club column completely (no redundant info)

## Design Summary

### Backend Changes
- Enrich `GET /members` response with `club_name` by batch-fetching clubs
- Add `club_name: Optional[str]` to `MemberResponse` DTO if not present
- Pattern: same as existing license/insurance enrichment

### Frontend Changes
- **Combobox filter**: Visible only for `super_admin`, uses ClubContext data
- **Table column "Club"**: Conditional on `super_admin`, renders clickable `club_name`
- **Mobile cards**: Show club name as clickable text for `super_admin` only
- **Filter chip**: Badge showing active club filter with × to clear
- **Empty state**: "No se encontraron miembros en este club" with clear filter button

### Files to Modify
| Layer | File | Change |
|-------|------|--------|
| Backend | `members.py` (router) | Enrich with `club_name` |
| Backend | `member_dtos.py` | Ensure `club_name` in response |
| Frontend | `MemberList.tsx` | Combobox + conditional column + cards |
| Frontend | `useMemberContext.tsx` | Expose `setClubFilter` / wiring |

### Files NOT Modified
- DB schema, domain entities, use cases, frontend services (already support `club_id` filter)

## Subagent Reports
- [x] backend-developer: Backend enrichment implementation - See `.claude/doc/members_club_filter/backend.md`
  - Decision: Add `find_by_ids()` method to `ClubRepository` for efficient batch fetching
  - Decision: Create separate `_enrich_members_with_club_names()` function following SRP
  - Decision: Inject `club_repo` via `Depends()` for all endpoints
  - Decision: Enrich all 4 member endpoints for API consistency
  - Pattern: Matches existing `license_summary`/`insurance_summary` enrichment
  - Implementation: 3-phase rollout (repository → DTO → enrichment)
- [x] frontend-developer: Frontend filter/column logic
  - Decision: Use `<button>` styled as link for clickable club names (not `<a>`)
  - Decision: Wrap `<th>/<td>` in `{isSuperAdmin && ...}` conditionals (no table restructure)
  - Decision: Add "Todos los clubs" as first SearchableSelect option with `value: ""`
  - Decision: Separate filter chips row below controls for active filters
  - Decision: Reset `offset: 0` on every filter change
- [x] shadcn-ui-architect: Combobox component design
  - Decision: Reuse existing `SearchableSelect` as-is (no modification needed)
  - Decision: Use shadcn `Badge` with `variant="secondary"` for active filter chip
  - Decision: Width `w-full sm:w-[240px]` for club combobox
  - Decision: Hybrid clear: both "Todos los clubs" option AND Badge × button

## Implementation Status
- [x] Phase 1: Backend enrichment
  - Added `find_by_ids()` to `ClubRepositoryPort` and `MongoDBClubRepository`
  - Added `club_name: Optional[str] = None` to `MemberResponse` DTO
  - Created `_enrich_members_with_club_names()` function in members router
  - Injected `club_repo` in 4 endpoints: get_members, get_member, get_members_by_club, search_members
  - All 478 backend tests pass
- [x] Phase 2: Frontend combobox + conditional rendering
  - Added `SearchableSelect` club filter (super_admin only) in filter row
  - Club column (`<th>/<td>`) conditional on `isSuperAdmin`
  - Club names in table/cards are clickable buttons that filter by that club
  - Active filter chip with Badge showing club name and X to clear
  - Enhanced empty state for club filter with "Limpiar filtro" button
  - Mobile cards: club info conditional on super_admin with clickable names
  - TypeScript compiles cleanly (no new errors)
- [x] Phase 3: QA validation
  - Backend API validation: ✅ ALL TESTS PASSED
    - ✅ GET /members returns club_name field (100 members tested)
    - ✅ GET /members?club_id=X filters correctly (25 members in test club)
    - ✅ GET /members/{id} returns club_name (single member tested)
    - ✅ All endpoints use consistent enrichment function
  - Frontend code review: ✅ PASSED
    - ✅ Club filter combobox implemented correctly (super_admin only)
    - ✅ Club column conditional rendering (super_admin only)
    - ✅ Clickable club names filter by club
    - ✅ Active filter chip with clear functionality
    - ✅ Enhanced empty state for club filter
    - ✅ Mobile responsive with club names in cards
  - Manual frontend testing: ⏳ PENDING
    - Playwright browser conflicts prevented automated UI testing
    - Comprehensive manual test plan provided in feedback report
    - 14 test cases for super admin + 5 test cases for club admin

## QA Validation Report
Comprehensive validation report available at:
`.claude/doc/members_club_filter/feedback_report.md`

**Key Findings**:
- Backend: 100% PASSED - All API endpoints working correctly
- Frontend: Code quality excellent, awaiting manual browser validation
- Security: Access control properly implemented
- Performance: Batch fetching prevents N+1 queries
- Accessibility: Good ARIA labels and semantic HTML

**Known Issues**:
- Demo credentials mismatch: admin@spainaikikai.es vs admin@spainaikikai.org
- Need to verify club admin test account exists

**Recommendations**:
- Execute manual test plan with both super admin and club admin accounts
- Verify or create club admin demo account (director@aikido-madrid.es)
- Consider adding E2E tests once Playwright conflicts resolved
- Consider splitting large MemberList component (450+ lines)
