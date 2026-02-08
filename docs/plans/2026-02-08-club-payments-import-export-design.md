# Club Payments Import/Export Design

## Problem
- Club annual payments data cannot be imported or exported
- `has_club_fee` is hardcoded to `false` in the summary use case
- No `cuota_club` type exists in `MemberPaymentType`

## Solution

### 1. Model Change: Add `cuota_club` to MemberPaymentType

Add `CUOTA_CLUB = "cuota_club"` to the enum. One `MemberPayment` record per club/year represents the club fee, using the admin's `member_id`.

Properties `is_license_payment` and `is_insurance_payment` exclude `cuota_club`.

### 2. Fix `has_club_fee` in GetAllClubsPaymentSummaryUseCase

After fetching payments for a club's members, check if any has `payment_type == cuota_club` and `status == completed`. Set `has_club_fee` accordingly.

### 3. New Tab "Pagos" in Import/Export Page

4th tab (super_admin only) in existing `ImportExportPage.tsx`.

#### Export (multi-sheet Excel)
- Filter: `payment_year` (required)
- **Sheet 1 "Resumen por Club"**: Club, Miembros, Cuota Club (Si/No), Licencias Pagadas, Seguros Pagados, Total Cobrado
- **Sheet 2 "Detalle por Miembro"**: Club, Miembro, DNI, Tipo Pago, Concepto, Monto, Estado, Ano

#### Import (single-sheet Excel)
- Columns: `DNI`, `Tipo Pago`, `Ano`, `Monto`, `Estado`, `Concepto`
- Lookup member by DNI
- Creates `MemberPayment` records
- Mode: `upsert` (match by member_id + year + type)

### 4. Backend Endpoints

- `GET /import-export/payments/export?payment_year=2024` → Excel blob
- `POST /import-export/payments/import` → ImportPaymentsResponse

### 5. Files to Modify

**Backend:**
- `backend/src/domain/entities/member_payment.py` - Add CUOTA_CLUB enum
- `backend/src/application/use_cases/member_payment/get_all_clubs_payment_summary_use_case.py` - Fix has_club_fee
- `backend/src/infrastructure/web/routers/import_export.py` - Add payment endpoints
- `backend/src/infrastructure/adapters/repositories/mongodb_member_payment_repository.py` - Add upsert method

**Frontend:**
- `frontend/src/features/import-export/components/ImportExportPage.tsx` - Add Pagos tab
- `frontend/src/features/import-export/data/schemas/import-export.schema.ts` - Add payment schemas
- `frontend/src/features/import-export/data/services/import-export.service.ts` - Add payment service functions
- `frontend/src/features/import-export/hooks/mutations/useImportExportMutations.ts` - Add payment mutations
