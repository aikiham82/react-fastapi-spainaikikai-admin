# Backend Implementation Plan: Licenses & Insurance Export DTOs and Endpoints

## Overview
This plan covers the backend implementation for adding DTOs and export endpoints for licenses and insurance to the existing import/export feature. This is **Task 1** of the import/export licenses & insurance feature.

## Context
- Session context: `.claude/sessions/context_session_import_export.md`
- Design document: `docs/plans/2026-02-06-import-export-licenses-insurance-design.md`
- Existing implementation: Members import/export is fully functional
- Architecture: Hexagonal architecture with FastAPI, Motor (MongoDB), Pydantic

## Files to Modify

### 1. `backend/src/infrastructure/web/dto/import_export_dto.py`
**Purpose**: Add new DTOs for licenses and insurance import requests

**Changes Required**:

Add the following DTOs (keep all existing DTOs):

```python
class ImportLicensesRequest(BaseModel):
    """DTO for importing licenses."""
    licenses: List[dict]


class ImportInsurancesRequest(BaseModel):
    """DTO for importing insurances."""
    insurances: List[dict]
```

**Notes**:
- `ImportMembersResponse` can be reused for all import responses (licenses, insurances, members)
- No export DTOs needed - endpoints return `StreamingResponse` directly
- `List[dict]` allows flexible field mapping like the existing `ImportMembersRequest`

---

### 2. `backend/src/infrastructure/web/routers/import_export.py`
**Purpose**: Add two new export endpoints for licenses and insurance

**Imports to Add**:

```python
from src.infrastructure.web.dependencies import (
    get_all_members_use_case,
    get_create_member_use_case,
    get_all_licenses_use_case,  # NEW
    get_all_insurances_use_case,  # NEW
    get_member_repository  # NEW
)
from src.domain.entities.license import LicenseStatus, TechnicalGrade, InstructorCategory, AgeCategory  # NEW
from src.domain.entities.insurance import InsuranceType, InsuranceStatus  # NEW
```

---

## Endpoint 1: Export Licenses

### Route Definition
```python
@router.get("/licenses/export")
async def export_licenses(
    limit: int = Query(1000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    club_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    technical_grade: Optional[str] = Query(None),
    age_category: Optional[str] = Query(None),
    get_all_use_case=Depends(get_all_licenses_use_case),
    member_repo=Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Export licenses to Excel file."""
```

### Authorization Check
```python
# Super admin only
if not ctx.is_super_admin:
    raise HTTPException(
        status_code=403,
        detail="Only super administrators can export licenses"
    )
```

### Data Fetching Logic

**Step 1: Fetch licenses**
```python
# Get licenses using the use case
licenses = await get_all_use_case.execute(limit=limit, club_id=club_id, member_id=None)
```

**Step 2: Batch member lookup pattern (CRITICAL for performance)**
```python
# Collect unique member IDs from licenses
member_ids = list(set([lic.member_id for lic in licenses if lic.member_id]))

# Batch fetch all members at once (NOT one by one)
member_map = {}  # member_id -> member object
for mid in member_ids:
    member = await member_repo.find_by_id(mid)
    if member:
        member_map[mid] = member
```

**IMPORTANT**: Do NOT fetch members in a loop while building Excel rows. This creates N+1 queries. Always batch fetch first, then use the dictionary for lookups.

**Step 3: Post-filter in Python (if filters provided)**
```python
# Apply additional filters (since use case doesn't support all filters)
filtered_licenses = licenses

if status:
    try:
        status_enum = LicenseStatus(status)
        filtered_licenses = [lic for lic in filtered_licenses if lic.status == status_enum]
    except ValueError:
        pass  # Invalid status, ignore filter

if technical_grade:
    try:
        grade_enum = TechnicalGrade(technical_grade)
        filtered_licenses = [lic for lic in filtered_licenses if lic.technical_grade == grade_enum]
    except ValueError:
        pass

if age_category:
    try:
        age_enum = AgeCategory(age_category)
        filtered_licenses = [lic for lic in filtered_licenses if lic.age_category == age_enum]
    except ValueError:
        pass
```

### Excel Generation

**Headers (Spanish)**:
```python
headers = [
    "Nº Licencia",
    "Nombre",
    "Apellidos",
    "DNI",
    "Club",
    "Grado Técnico",
    "Cat. Instructor",
    "Cat. Edad",
    "Estado",
    "Fecha Emisión",
    "Fecha Expiración",
    "Renovada"
]
```

**Excel Styling (copy from existing export_members)**:
```python
# Header style
header_font = Font(bold=True, color="FFFFFF")
header_fill = PatternFill(start_color="4A5568", end_color="4A5568", fill_type="solid")

# Apply to headers
for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center")
```

**Data Row Generation**:
```python
for row_idx, license in enumerate(filtered_licenses, 2):
    # Get member from pre-fetched map
    member = member_map.get(license.member_id)

    ws.cell(row=row_idx, column=1, value=license.license_number)
    ws.cell(row=row_idx, column=2, value=member.first_name if member else '')
    ws.cell(row=row_idx, column=3, value=member.last_name if member else '')
    ws.cell(row=row_idx, column=4, value=member.dni if member else '')
    ws.cell(row=row_idx, column=5, value=member.club_id if member else '')  # Club ID as placeholder
    ws.cell(row=row_idx, column=6, value=license.technical_grade.value if license.technical_grade else '')
    ws.cell(row=row_idx, column=7, value=license.instructor_category.value if license.instructor_category else '')
    ws.cell(row=row_idx, column=8, value=license.age_category.value if license.age_category else '')
    ws.cell(row=row_idx, column=9, value=license.status.value if license.status else '')
    ws.cell(row=row_idx, column=10, value=license.issue_date.strftime('%d/%m/%Y') if license.issue_date else '')
    ws.cell(row=row_idx, column=11, value=license.expiration_date.strftime('%d/%m/%Y') if license.expiration_date else '')
    ws.cell(row=row_idx, column=12, value='Sí' if license.is_renewed else 'No')
```

**Column Width Adjustment** (copy from existing):
```python
# Adjust column widths
for col in ws.columns:
    max_length = 0
    column = col[0].column_letter
    for cell in col:
        try:
            if len(str(cell.value)) > max_length:
                max_length = len(str(cell.value))
        except:
            pass
    adjusted_width = min(max_length + 2, 50)
    ws.column_dimensions[column].width = adjusted_width
```

**Response Generation**:
```python
# Save to BytesIO
output = BytesIO()
wb.save(output)
output.seek(0)

# Generate filename with timestamp - USE datetime.now() NOT datetime.now(timezone.utc)
filename = f"licencias_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

return StreamingResponse(
    output,
    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    headers={
        "Content-Disposition": f"attachment; filename={filename}"
    }
)
```

---

## Endpoint 2: Export Insurances

### Route Definition
```python
@router.get("/insurances/export")
async def export_insurances(
    limit: int = Query(1000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    club_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    insurance_type: Optional[str] = Query(None),
    get_all_use_case=Depends(get_all_insurances_use_case),
    member_repo=Depends(get_member_repository),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Export insurances to Excel file."""
```

### Authorization Check
```python
# Super admin only
if not ctx.is_super_admin:
    raise HTTPException(
        status_code=403,
        detail="Only super administrators can export insurances"
    )
```

### Data Fetching Logic

**Step 1: Fetch insurances**
```python
# Get insurances using the use case
insurances = await get_all_use_case.execute(limit=limit, club_id=club_id, member_id=None)
```

**Step 2: Batch member lookup** (same pattern as licenses)
```python
# Collect unique member IDs
member_ids = list(set([ins.member_id for ins in insurances if ins.member_id]))

# Batch fetch members
member_map = {}
for mid in member_ids:
    member = await member_repo.find_by_id(mid)
    if member:
        member_map[mid] = member
```

**Step 3: Post-filter in Python**
```python
filtered_insurances = insurances

if status:
    try:
        status_enum = InsuranceStatus(status)
        filtered_insurances = [ins for ins in filtered_insurances if ins.status == status_enum]
    except ValueError:
        pass

if insurance_type:
    try:
        type_enum = InsuranceType(insurance_type)
        filtered_insurances = [ins for ins in filtered_insurances if ins.insurance_type == type_enum]
    except ValueError:
        pass
```

### Excel Generation

**Headers (Spanish)**:
```python
headers = [
    "Nº Póliza",
    "Nombre",
    "Apellidos",
    "DNI",
    "Club",
    "Tipo Seguro",
    "Compañía",
    "Cobertura",
    "Estado",
    "Fecha Inicio",
    "Fecha Fin"
]
```

**Styling**: Same as licenses export

**Data Row Generation**:
```python
for row_idx, insurance in enumerate(filtered_insurances, 2):
    member = member_map.get(insurance.member_id)

    ws.cell(row=row_idx, column=1, value=insurance.policy_number)
    ws.cell(row=row_idx, column=2, value=member.first_name if member else '')
    ws.cell(row=row_idx, column=3, value=member.last_name if member else '')
    ws.cell(row=row_idx, column=4, value=member.dni if member else '')
    ws.cell(row=row_idx, column=5, value=member.club_id if member else '')
    ws.cell(row=row_idx, column=6, value=insurance.insurance_type.value if insurance.insurance_type else '')
    ws.cell(row=row_idx, column=7, value=insurance.insurance_company)
    ws.cell(row=row_idx, column=8, value=str(insurance.coverage_amount) if insurance.coverage_amount else '')
    ws.cell(row=row_idx, column=9, value=insurance.status.value if insurance.status else '')
    ws.cell(row=row_idx, column=10, value=insurance.start_date.strftime('%d/%m/%Y') if insurance.start_date else '')
    ws.cell(row=row_idx, column=11, value=insurance.end_date.strftime('%d/%m/%Y') if insurance.end_date else '')
```

**Column width adjustment**: Same as licenses

**Response Generation**:
```python
filename = f"seguros_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
# ... same StreamingResponse pattern
```

---

## Critical Implementation Notes

### 1. DateTime Handling
**CRITICAL**: MongoDB stores **naive** datetimes in this project.

✅ **CORRECT**:
```python
datetime.now()
```

❌ **INCORRECT**:
```python
datetime.now(timezone.utc)  # DO NOT USE
```

### 2. Member Batch Lookup Pattern
**CRITICAL**: Always batch fetch members to avoid N+1 queries.

✅ **CORRECT Pattern**:
```python
# Step 1: Collect all member IDs
member_ids = list(set([item.member_id for item in items if item.member_id]))

# Step 2: Batch fetch ALL members ONCE
member_map = {}
for mid in member_ids:
    member = await member_repo.find_by_id(mid)
    if member:
        member_map[mid] = member

# Step 3: Use map for lookups when building rows
for item in items:
    member = member_map.get(item.member_id)
    # ... use member data
```

❌ **INCORRECT Pattern (N+1 query problem)**:
```python
# DON'T DO THIS - fetches member inside the loop
for item in items:
    member = await member_repo.find_by_id(item.member_id)  # BAD!
```

### 3. Authorization Pattern
All license and insurance export/import endpoints MUST check `ctx.is_super_admin`:

```python
if not ctx.is_super_admin:
    raise HTTPException(
        status_code=403,
        detail="Only super administrators can export licenses"
    )
```

### 4. Excel Styling Consistency
Use the **exact same styling** as `export_members`:
- Header font: Bold, white text (`FFFFFF`)
- Header fill: Dark gray (`4A5568`)
- Header alignment: Center
- Column width: Auto-adjust with max 50 characters

### 5. Filter Handling
Since the use cases only support `club_id` and `member_id` filters, additional filters (status, technical_grade, insurance_type, age_category) MUST be applied in Python **after** fetching from the database:

```python
# Fetch all matching club_id filter
items = await get_all_use_case.execute(limit=limit, club_id=club_id)

# Then filter in Python for other criteria
if status:
    try:
        status_enum = SomeStatus(status)
        items = [item for item in items if item.status == status_enum]
    except ValueError:
        pass  # Ignore invalid status values
```

### 6. Entity Field Reference

**License Entity Fields**:
- `license_number` (str)
- `member_id` (str)
- `grade` (str)
- `status` (LicenseStatus enum: active, expired, pending, revoked)
- `issue_date` (datetime)
- `expiration_date` (datetime)
- `is_renewed` (bool)
- `technical_grade` (TechnicalGrade enum: dan, kyu)
- `instructor_category` (InstructorCategory enum: none, fukushidoin, shidoin)
- `age_category` (AgeCategory enum: infantil, adulto)

**Insurance Entity Fields**:
- `policy_number` (str)
- `member_id` (str)
- `insurance_type` (InsuranceType enum: accident, civil_liability)
- `insurance_company` (str)
- `coverage_amount` (float, optional)
- `status` (InsuranceStatus enum: active, expired, pending, cancelled)
- `start_date` (datetime)
- `end_date` (datetime)

**Member Entity Fields** (for display):
- `first_name` (str)
- `last_name` (str)
- `dni` (str)
- `club_id` (str, optional)

### 7. Club Display Note
Currently, we're displaying `member.club_id` (the ID) in the "Club" column. To display the actual club name would require:
1. Batch fetching clubs (similar to member lookup)
2. Creating a `club_map` dictionary
3. Looking up club names: `club_map.get(member.club_id).name if member.club_id else ''`

For now, stick with `club_id` unless explicitly requested to implement club name resolution.

### 8. Available Dependencies
These dependencies are already configured in `dependencies.py` and ready to use:

```python
get_all_licenses_use_case()  # Returns GetAllLicensesUseCase
get_all_insurances_use_case()  # Returns GetAllInsurancesUseCase
get_member_repository()  # Returns MongoDBMemberRepository
get_auth_context()  # Returns AuthContext with user and member
```

**Use Case Signatures**:
```python
# GetAllLicensesUseCase.execute
async def execute(
    limit: int = 100,
    club_id: Optional[str] = None,
    member_id: Optional[str] = None
) -> List[License]

# GetAllInsurancesUseCase.execute
async def execute(
    limit: int = 100,
    club_id: Optional[str] = None,
    member_id: Optional[str] = None
) -> List[Insurance]

# MongoDBMemberRepository.find_by_id
async def find_by_id(member_id: str) -> Optional[Member]
```

### 9. Error Handling
Follow the existing pattern - no explicit try/catch for the main endpoint logic. FastAPI will handle exceptions:
- Invalid ObjectId → caught by repository
- Missing member → return empty strings in Excel
- Invalid enum values in filters → silently ignore with try/except ValueError

---

## Testing Checklist

After implementation, verify:

1. **Authorization**:
   - [ ] Super admin can access both endpoints
   - [ ] Non-super-admin gets 403 error

2. **Data Fetching**:
   - [ ] Licenses fetched with correct limit
   - [ ] Insurances fetched with correct limit
   - [ ] `club_id` filter works (if provided)
   - [ ] Batch member lookup is efficient (no N+1 queries)

3. **Post-filtering**:
   - [ ] `status` filter works for licenses
   - [ ] `technical_grade` filter works for licenses
   - [ ] `age_category` filter works for licenses
   - [ ] `status` filter works for insurances
   - [ ] `insurance_type` filter works for insurances
   - [ ] Invalid filter values are ignored gracefully

4. **Excel Output**:
   - [ ] Headers are in Spanish
   - [ ] Headers have correct styling (dark gray, white text, bold, centered)
   - [ ] All columns have correct data
   - [ ] Dates formatted as DD/MM/YYYY
   - [ ] Boolean `is_renewed` shows as "Sí"/"No"
   - [ ] Column widths auto-adjust
   - [ ] Filename includes timestamp
   - [ ] File downloads correctly

5. **Edge Cases**:
   - [ ] Member not found → shows empty strings
   - [ ] No licenses/insurances found → empty Excel with headers
   - [ ] Date fields are None → shows empty string
   - [ ] Coverage amount is None → shows empty string

---

## Implementation Order

1. **First**: Add DTOs to `import_export_dto.py`
2. **Second**: Add imports to `import_export.py` router
3. **Third**: Implement `export_licenses` endpoint
4. **Fourth**: Implement `export_insurances` endpoint
5. **Fifth**: Test both endpoints manually

---

## Summary

This implementation adds:
- 2 new DTOs (`ImportLicensesRequest`, `ImportInsurancesRequest`)
- 2 new export endpoints (GET `/licenses/export`, GET `/insurances/export`)
- Super admin authorization checks
- Batch member lookup for performance
- Excel generation with consistent styling
- Post-filtering for status, grade, type, and category

**Key principles**:
- Use `datetime.now()` (naive), not `datetime.now(timezone.utc)`
- Batch fetch members to avoid N+1 queries
- Apply additional filters in Python after DB fetch
- Match existing Excel styling from members export
- Super admin only for license/insurance operations

**Next Task**: Backend import endpoints (Task 2) will add POST `/licenses/import` and POST `/insurances/import` with DNI-based member lookup.
