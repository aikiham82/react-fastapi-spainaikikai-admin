# Member Licenses & Insurance Badges

## Summary

Add license and insurance summary information to the member list table and the quick-view dialog. Users can see at a glance if a member is Kyu/Dan, Shidoin/Fukushidoin, and whether they have active RC or accident insurance.

## Decisions

- **Location**: Expand existing quick-view dialog + add badge columns to the member table
- **Data format**: Visual badges with color-coded status (not full detail tables)
- **Data source**: Enrich the existing `GET /api/v1/members` endpoint with summary data (single API call, no N+1)

## Backend Changes

### New DTOs

```python
class LicenseSummary(BaseModel):
    grade: Optional[str]              # "2º Dan", "3º Kyu"
    instructor_category: Optional[str] # "shidoin", "fukushidoin", None
    status: Optional[str]             # "active", "expired", "pending"
    expiry_date: Optional[str]

class InsuranceSummary(BaseModel):
    has_accident: bool
    accident_status: Optional[str]    # "active", "expired"
    has_rc: bool
    rc_status: Optional[str]          # "active", "expired"

class MemberResponse(BaseModel):  # extended
    ...existing fields...
    license_summary: Optional[LicenseSummary]
    insurance_summary: Optional[InsuranceSummary]
```

### Aggregation Strategy

In the members router, after fetching the member list:
1. Collect all `member_ids` from the result set
2. Batch query licenses collection for those member_ids (most recent per member)
3. Batch query insurances collection for those member_ids (grouped by type)
4. Populate `license_summary` and `insurance_summary` on each member response

## Frontend Changes

### Schema Update (`member.schema.ts`)

Add `license_summary` and `insurance_summary` optional fields to the `Member` interface.

### Table Columns (`MemberList.tsx`)

| Column | Content | Badge Colors |
|--------|---------|-------------|
| Grado | Grade + instructor category | Blue for grade, purple for instructor |
| Seguro RC | RC insurance status | Green=active, Red=expired, Gray=none |
| Seguro Acc. | Accident insurance status | Green=active, Red=expired, Gray=none |

Responsive: RC and Accident columns hidden on mobile.

### Quick-View Dialog (`MemberList.tsx`)

Add two sections below personal data:
- **Licencia**: Grade badge, instructor category badge, license number, status, expiry date
- **Seguros**: RC badge with status, Accident badge with status, coverage dates

## Implementation Order

1. Backend: DTOs + batch aggregation in members router
2. Frontend: Update member schema
3. Frontend: Add table columns with badges
4. Frontend: Expand quick-view dialog
5. Tests: Backend aggregation + frontend components
