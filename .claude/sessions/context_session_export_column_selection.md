# Session: Export Column Selection Feature

## Status: IMPLEMENTED

## What was done

### Backend (`backend/src/infrastructure/web/routers/import_export.py`)
- Added `_parse_columns()` helper to parse comma-separated column keys
- Added `_build_excel()` shared helper that builds Excel workbooks using column registries with optional column filtering
- Defined `MEMBERS_COLUMN_REGISTRY` as a list of `(key, header, extractor)` tuples
- Added `columns: Optional[str] = Query(None)` parameter to all 4 export endpoints:
  - `/members/export` - 15 columns
  - `/licenses/export` - 12 columns
  - `/insurances/export` - 11 columns
  - `/payments/export` - 9 columns
- Backward compatible: if `columns` is not provided, all columns are exported

### Frontend

#### New: `ColumnSelector.tsx`
- Reusable collapsible component with checkboxes for column selection
- Shows "Columnas a exportar (X de Y)" header with toggle
- "Todas" / "Ninguna" quick actions
- 2-column grid of checkboxes using Radix UI Checkbox

#### Modified: `import-export.schema.ts`
- Added `columns?: string` to all 4 `Export*Filters` interfaces

#### Modified: `ImportExportPage.tsx`
- Added column definitions arrays for all 4 entity types
- Added `useState` for selected columns per entity (all selected by default)
- Integrated `ColumnSelector` into each export card between filters and export button
- Passes `columns` as comma-separated string only when not all columns are selected
- Export button disabled when zero columns selected

### Service layer
- No changes needed - `columns` passes through as a regular query param via existing `params` spread

## Column Keys

### Members (15)
id, first_name, last_name, dni, email, phone, birth_date, address, city, province, postal_code, country, club_id, status, created_at

### Licenses (12)
license_number, first_name, last_name, dni, club, technical_grade, instructor_category, age_category, status, issue_date, expiration_date, is_renewed

### Insurances (11)
policy_number, first_name, last_name, dni, club, insurance_type, insurance_company, coverage_amount, status, start_date, end_date

### Payments (9)
club, first_name, last_name, dni, payment_type, concept, amount, status, payment_year
