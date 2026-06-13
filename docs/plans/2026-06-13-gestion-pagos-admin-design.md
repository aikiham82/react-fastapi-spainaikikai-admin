# Gestión manual de pagos por el administrador

**Fecha:** 2026-06-13
**Autor:** super_admin feature design
**Estado:** Aprobado, pendiente de implementación

## Objetivo

Permitir que el `super_admin` registre, edite y elimine pagos manualmente desde el
drill-down de "Resumen de Pagos", a dos niveles: la transacción `Payment` y sus
líneas `MemberPayment`. Cubre cobros offline (efectivo/transferencia), correcciones,
anulación de errores y alta manual de cobros (marcar como pagado).

## Decisiones de alcance

- **Permisos:** solo `super_admin`. `club_admin` queda fuera de esta feature.
- **Niveles:** ambos — transacción `Payment` y líneas `MemberPayment`.
- **Entrada UI:** integrado en el "Resumen de Pagos" existente (drill-down de club).
- **Facturas:** un pago manual completado **siempre** genera `Invoice`, igual que Redsys.
- **Método de pago:** se añade campo `payment_method` a la entidad `Payment`.

### Fuera de alcance (YAGNI)

- Importación/actualización masiva de pagos.
- Gestión por `club_admin`.
- Edición libre de importes de pagos Redsys ya liquidados (solo lectura; borrado con `force`).

## Modelo de datos

### `Payment` — cambio

```python
class PaymentMethod(str, Enum):
    REDSYS = "redsys"
    CASH = "cash"
    TRANSFER = "transfer"
    OTHER = "other"

# nuevo campo en Payment
payment_method: PaymentMethod = PaymentMethod.REDSYS
```

- Validación en `__post_init__`: coacciona string → enum; inválido → `InvalidPaymentDataError`.
- Migración Mongo: **no destructiva**. El adapter lee documentos `transactions` sin
  `payment_method` con default `REDSYS`.

### `MemberPayment` — sin cambio de esquema

Ya dispone de `payment_id`, `member_id`, `payment_type`, `concept`, `amount`,
`status`, `payment_year`.

### Estructura de un pago manual

1. `Payment` padre: `club_id`, `payment_type=ANNUAL_QUOTA`, `payment_method=CASH/TRANSFER/OTHER`,
   `status=COMPLETED`, `payment_date=now`, `amount`=suma de líneas, `payer_name`.
2. N `MemberPayment` (miembro × tipo) en `COMPLETED`, ligadas al `payment_id`.
3. `Invoice` generada reusando la lógica del webhook Redsys.

Refleja la misma estructura que produce Redsys → "Resumen de Pagos" funciona sin tocar agregaciones.

## Backend (arquitectura hexagonal)

### Use cases

1. **`RegisterManualPaymentUseCase`** — orquesta padre + líneas + factura.
   - Valida club, año, líneas no vacías.
   - Rechaza duplicado miembro+tipo+año (`DuplicatePaymentForYearError`).
   - Persiste padre → líneas → `Invoice` (reusa `GenerateInvoiceUseCase`/lógica del webhook).
2. **`UpdatePaymentUseCase`** — editables: `amount`, `payment_year`, `payment_method`,
   `payer_name`, `status` (transición controlada).
3. **`UpdateMemberPaymentUseCase`** — editables: `payment_type`, `concept`, `amount`, `status`.
   Recalcula el `amount` del `Payment` padre = suma de líneas COMPLETED.
4. **`DeletePaymentUseCase`** (ampliar) — cascade: borra `MemberPayment`s → `Invoice` → `Payment`.

### Endpoints (todos `require_super_admin`)

| Método | Ruta | Acción |
|--------|------|--------|
| POST | `/api/v1/payments/manual` | Registrar pago manual (padre+líneas+factura) |
| PUT | `/api/v1/payments/{id}` | Editar Payment |
| DELETE | `/api/v1/payments/{id}` | Eliminar (cascade); `force=true` para Redsys COMPLETED |
| GET | `/api/v1/member-payments/club/{club_id}` | Listar MemberPayments del club (año) |
| PUT | `/api/v1/member-payments/{id}` | Editar línea |
| DELETE | `/api/v1/member-payments/{id}` | Eliminar línea |

### DTOs

- `ManualPaymentRequest`: `payer_name`, `club_id`, `payment_year`, `payment_method`,
  `member_assignments[]`, `include_club_fee`.
- `PaymentUpdateRequest`, `MemberPaymentUpdateRequest`.
- Mappers correspondientes.

## Reglas de negocio y casos borde

- **Redsys COMPLETED:** edición bloqueada (`InvalidPaymentStatusError` → HTTP 409).
  Borrado solo con `force=true`; sin flag → 409.
- **Pagos manuales** (CASH/TRANSFER/OTHER): editables/borrables libremente.
- **Cascade delete:** líneas → factura → padre. Sin transacción Mongo: abortar y
  reportar si falla un paso, loguear cada paso, no dejar estado parcial.
- **Recálculo de importe padre:** al editar/eliminar líneas, `Payment.amount` =
  suma de líneas COMPLETED, para evitar descuadres en "Total Cobrado".
- **Duplicados:** miembro+tipo+año ya pagado → `DuplicatePaymentForYearError` (409).
- **Validación:** `amount >= 0`, `payment_year` 1900-2100 (ya en entity).

## Frontend (feature-based, `club-payments`)

### UI (integrada en drill-down)

`ClubPaymentDetail.tsx`:
- Botón **"Registrar pago manual"** → `ManualPaymentModal` (miembros + tipos + método + año).
- Acciones por miembro: editar/eliminar línea (`MemberPaymentEditModal`, `ConfirmDeleteDialog`).
- Sección **"Transacciones"**: tabla de `Payment`s del club (importe, método, estado, fecha);
  Redsys COMPLETED con acciones deshabilitadas salvo eliminar-con-confirmación-`force`.

### Capa de datos

- **Schemas (Zod):** `manualPaymentSchema`, `paymentUpdateSchema`,
  `memberPaymentUpdateSchema`, `paymentMethodSchema`.
- **Services:** `registerManualPayment`, `updatePayment`, `deletePayment`,
  `updateMemberPayment`, `deleteMemberPayment`, `getClubMemberPayments`.
- **Mutations:** `useRegisterManualPayment`, `useUpdatePayment`, `useDeletePayment`,
  `useUpdateMemberPayment`, `useDeleteMemberPayment` → `{action, isLoading, error, isSuccess}`,
  invalidan la query del summary.
- **UI:** vía `shadcn-ui-architect` (Dialog, Form, Select, AlertDialog).

### Permisos

Acciones solo se renderizan si `usePermissions().isAssociationAdmin()`.
Backend re-valida con `require_super_admin`.

## Testing

- **Backend** (`backend-test-engineer`): unit de los 3 use cases nuevos + cascade delete +
  force Redsys + recálculo padre + duplicados. Cobertura ≥80%.
- **Frontend** (`frontend-test-engineer`): mutations, modales, gating por rol.
- **QA final** (`qa-criteria-validator`): Playwright sobre el flujo completo.
