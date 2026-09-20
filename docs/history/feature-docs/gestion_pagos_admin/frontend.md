# Frontend Implementation Plan — Gestión Manual de Pagos

**Feature:** gestion_pagos_admin  
**Design ref:** `docs/plans/2026-06-13-gestion-pagos-admin-design.md`  
**Scope:** super_admin only. Integrated into the existing `club-payments` drill-down (`ClubPaymentDetail`).

---

## 0. Current state audit

### Files that EXIST and must NOT be renamed

```
frontend/src/features/club-payments/
  components/
    ClubPaymentDetail.tsx          <- TARGET for integration (258 lines)
    ClubPaymentsPage.tsx
    AllClubsSummaryTable.tsx
  data/
    schemas/club-payments.schema.ts
    services/club-payments.service.ts
  hooks/
    queries/useClubPaymentsQueries.ts   <- contains clubPaymentsKeys
    useClubPaymentsContext.tsx
  index.ts

frontend/src/features/member-payments/
  data/
    schemas/member-payment.schema.ts    <- MemberPayment type lives here
    services/member-payment.service.ts
  hooks/queries/useMemberPaymentQueries.ts
```

### Critical: query key that mutations MUST invalidate

The club detail view is fed by `useClubPaymentDetailQuery`, whose key is:

```ts
// frontend/src/features/club-payments/hooks/queries/useClubPaymentsQueries.ts  line 8
clubPaymentsKeys.clubDetail = (clubId: string, year?: number) =>
  ['club-payments', 'club-detail', clubId, year] as const
```

Mutations must also invalidate `clubPaymentsKeys.allClubsSummary(year)` so the top-level summary table stays fresh.

### Missing directory (RISK — must create)

`frontend/src/features/club-payments/hooks/mutations/` does NOT exist yet.  
All five mutation hooks go there. Create the directory together with the first file.

### Mutation return pattern (canonical)

From `useLoginMutation` (auth feature):
```ts
return {
  login: loginMutation.mutate,     // named action
  isLoading: loginMutation.isPending,
  error: loginMutation.error,
}
```
Our mutations follow the same structure: `{ action, isLoading, error, isSuccess }` where:
- `action` = `mutation.mutate` named after the verb  
- `isLoading` = `mutation.isPending`
- `error` = `mutation.error`
- `isSuccess` = `mutation.isSuccess`

Toast pattern from `useClubMutations` / `useMemberMutations`: `toast.success(...)` / `toast.error(error.detail || '...')`.

### UI components available in `src/components/ui/`

Confirmed present:
- `dialog.tsx` — Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
- `alert-dialog.tsx` — AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
- `button.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `badge.tsx`
- `checkbox.tsx`, `switch.tsx`, `textarea.tsx`
- `table.tsx` — Table, TableBody, TableCell, TableHead, TableHeader, TableRow
- `card.tsx`, `separator.tsx`, `scroll-area.tsx`, `skeleton.tsx`
- `sonner.tsx` (toast)

NOT present: `form.tsx` (no react-hook-form form primitive installed). Use plain controlled inputs and Zod `.safeParse()` like `useAnnualPaymentForm.ts` does.

### Color tokens to use (from `src/index.css`)

Use Tailwind CSS tokens mapped to CSS variables — do NOT use hex or fixed colour classes:
- Primary actions: `bg-primary text-primary-foreground`
- Destructive/delete: `text-destructive` / `variant="destructive"` on Badge/Button
- Muted text: `text-muted-foreground`
- Borders: `border` (maps to `--border`)
- Card backgrounds: `bg-card`
- Success/paid states: continue the existing pattern `text-green-600` (already used in ClubPaymentDetail)
- Error/pending states: `text-red-500` / `text-red-400` (already used)

---

## 1. Zod Schemas

**File to create:** `frontend/src/features/club-payments/data/schemas/payment-admin.schema.ts`

This file is NEW — add it alongside `club-payments.schema.ts`. Keep `club-payments.schema.ts` untouched.

```ts
import { z } from 'zod';

// ─── Payment Method ────────────────────────────────────────────────
export const paymentMethodSchema = z.enum(['redsys', 'cash', 'transfer', 'other']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  redsys: 'Redsys (online)',
  cash: 'Efectivo',
  transfer: 'Transferencia',
  other: 'Otro',
};

// ─── Payment (transaction header) ─────────────────────────────────
export const paymentSchema = z.object({
  id: z.string(),
  club_id: z.string(),
  payment_type: z.string(),
  payment_method: paymentMethodSchema.default('redsys'),
  status: z.string(),
  amount: z.number(),
  payment_year: z.number(),
  payer_name: z.string(),
  payment_date: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

// ─── Register Manual Payment ───────────────────────────────────────
// Matches backend ManualPaymentRequest DTO
const memberAssignmentSchema = z.object({
  member_id: z.string().min(1),
  member_name: z.string().min(1),
  payment_types: z.array(z.string()).min(1),
});

export const manualPaymentSchema = z.object({
  payer_name: z.string().min(1, 'El nombre del pagador es obligatorio'),
  club_id: z.string().min(1, 'El club es obligatorio'),
  payment_year: z
    .number()
    .int()
    .min(1900, 'Año inválido')
    .max(2100, 'Año inválido'),
  payment_method: paymentMethodSchema,
  member_assignments: z
    .array(memberAssignmentSchema)
    .min(1, 'Debe asignar al menos un miembro'),
  include_club_fee: z.boolean(),
});
export type ManualPaymentFormData = z.infer<typeof manualPaymentSchema>;

// ─── Update Payment ────────────────────────────────────────────────
export const paymentUpdateSchema = z.object({
  amount: z.number().min(0, 'El importe no puede ser negativo').optional(),
  payment_year: z.number().int().min(1900).max(2100).optional(),
  payment_method: paymentMethodSchema.optional(),
  payer_name: z.string().min(1).optional(),
  status: z.string().optional(),
});
export type PaymentUpdateFormData = z.infer<typeof paymentUpdateSchema>;

// ─── Update MemberPayment (line) ───────────────────────────────────
export const memberPaymentUpdateSchema = z.object({
  payment_type: z.string().optional(),
  concept: z.string().optional(),
  amount: z.number().min(0, 'El importe no puede ser negativo').optional(),
  status: z.string().optional(),
});
export type MemberPaymentUpdateFormData = z.infer<typeof memberPaymentUpdateSchema>;

// ─── Club Member Payments list (GET /api/v1/member-payments/club/{club_id}) ─
// Reuses MemberPayment from member-payment.schema.ts.
// Import type MemberPayment from '@/features/member-payments/data/schemas/member-payment.schema'
// when used in the query hook.
```

---

## 2. Services

**File to create:** `frontend/src/features/club-payments/data/services/payment-admin.service.ts`

Keep `club-payments.service.ts` untouched (it only has read operations).

```ts
import { apiClient } from '@/core/data/apiClient';
import type { Payment } from '../schemas/payment-admin.schema';
import type { MemberPayment } from '@/features/member-payments/data/schemas/member-payment.schema';

const PAYMENTS_URL = '/api/v1/payments';
const MEMBER_PAYMENTS_URL = '/api/v1/member-payments';

// POST /api/v1/payments/manual
export const registerManualPayment = async (
  data: {
    payer_name: string;
    club_id: string;
    payment_year: number;
    payment_method: string;
    member_assignments: { member_id: string; member_name: string; payment_types: string[] }[];
    include_club_fee: boolean;
  }
): Promise<Payment> => {
  return await apiClient.post<Payment>(`${PAYMENTS_URL}/manual`, data);
};

// PUT /api/v1/payments/{id}
export const updatePayment = async (
  id: string,
  data: Partial<{
    amount: number;
    payment_year: number;
    payment_method: string;
    payer_name: string;
    status: string;
  }>
): Promise<Payment> => {
  return await apiClient.put<Payment>(`${PAYMENTS_URL}/${id}`, data);
};

// DELETE /api/v1/payments/{id}?force=true|false
export const deletePayment = async (id: string, force = false): Promise<void> => {
  return await apiClient.delete<void>(`${PAYMENTS_URL}/${id}`, {
    params: force ? { force: true } : undefined,
  });
};

// GET /api/v1/member-payments/club/{club_id}  (with optional payment_year)
export const getClubMemberPayments = async (
  clubId: string,
  paymentYear?: number
): Promise<MemberPayment[]> => {
  const params = paymentYear ? { payment_year: paymentYear } : undefined;
  return await apiClient.get<MemberPayment[]>(
    `${MEMBER_PAYMENTS_URL}/club/${clubId}`,
    { params }
  );
};

// PUT /api/v1/member-payments/{id}
export const updateMemberPayment = async (
  id: string,
  data: Partial<{
    payment_type: string;
    concept: string;
    amount: number;
    status: string;
  }>
): Promise<MemberPayment> => {
  return await apiClient.put<MemberPayment>(`${MEMBER_PAYMENTS_URL}/${id}`, data);
};

// DELETE /api/v1/member-payments/{id}
export const deleteMemberPayment = async (id: string): Promise<void> => {
  return await apiClient.delete<void>(`${MEMBER_PAYMENTS_URL}/${id}`);
};

export const paymentAdminService = {
  registerManualPayment,
  updatePayment,
  deletePayment,
  getClubMemberPayments,
  updateMemberPayment,
  deleteMemberPayment,
};
```

---

## 3. Mutation Hooks

**Directory to create:** `frontend/src/features/club-payments/hooks/mutations/`

**File:** `frontend/src/features/club-payments/hooks/mutations/usePaymentAdminMutations.ts`

All five mutations live in a single file to avoid proliferating small files (follow the clubs/members pattern of grouping mutations by feature resource).

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { paymentAdminService } from '../../data/services/payment-admin.service';
import { clubPaymentsKeys } from '../queries/useClubPaymentsQueries';

// ─── Register Manual Payment ───────────────────────────────────────────────
export const useRegisterManualPaymentMutation = (clubId: string, year: number) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: paymentAdminService.registerManualPayment,
    onSuccess: () => {
      toast.success('Pago registrado correctamente');
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubDetail(clubId, year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.allClubsSummary(year) });
    },
    onError: (error: { detail?: string; message?: string }) => {
      toast.error(error.detail || 'Error al registrar el pago');
    },
  });

  return {
    registerManualPayment: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};

// ─── Update Payment ────────────────────────────────────────────────────────
export const useUpdatePaymentMutation = (clubId: string, year: number) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof paymentAdminService.updatePayment>[1] }) =>
      paymentAdminService.updatePayment(id, data),
    onSuccess: () => {
      toast.success('Pago actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubDetail(clubId, year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.allClubsSummary(year) });
    },
    onError: (error: { detail?: string; message?: string }) => {
      toast.error(error.detail || 'Error al actualizar el pago');
    },
  });

  return {
    updatePayment: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};

// ─── Delete Payment ────────────────────────────────────────────────────────
export const useDeletePaymentMutation = (clubId: string, year: number) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      paymentAdminService.deletePayment(id, force),
    onSuccess: () => {
      toast.success('Pago eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubDetail(clubId, year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.allClubsSummary(year) });
    },
    onError: (error: { detail?: string; message?: string }) => {
      toast.error(error.detail || 'Error al eliminar el pago');
    },
  });

  return {
    deletePayment: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};

// ─── Update MemberPayment line ─────────────────────────────────────────────
export const useUpdateMemberPaymentMutation = (clubId: string, year: number) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof paymentAdminService.updateMemberPayment>[1] }) =>
      paymentAdminService.updateMemberPayment(id, data),
    onSuccess: () => {
      toast.success('Línea de pago actualizada correctamente');
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubDetail(clubId, year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.allClubsSummary(year) });
    },
    onError: (error: { detail?: string; message?: string }) => {
      toast.error(error.detail || 'Error al actualizar la línea de pago');
    },
  });

  return {
    updateMemberPayment: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};

// ─── Delete MemberPayment line ─────────────────────────────────────────────
export const useDeleteMemberPaymentMutation = (clubId: string, year: number) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => paymentAdminService.deleteMemberPayment(id),
    onSuccess: () => {
      toast.success('Línea de pago eliminada correctamente');
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.clubDetail(clubId, year) });
      queryClient.invalidateQueries({ queryKey: clubPaymentsKeys.allClubsSummary(year) });
    },
    onError: (error: { detail?: string; message?: string }) => {
      toast.error(error.detail || 'Error al eliminar la línea de pago');
    },
  });

  return {
    deleteMemberPayment: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};
```

**Note on `clubId` / `year` parameters:** These are passed into the hook so they can be captured in the closure for `invalidateQueries`. The caller (`ClubPaymentDetail` or `TransactionsSection`) already has `clubDetail.club_id` and `selectedYear` from context — pass them at hook instantiation time.

---

## 4. Query Hook — Club Member Payments

**File to MODIFY:** `frontend/src/features/club-payments/hooks/queries/useClubPaymentsQueries.ts`

Add a new key and new hook at the bottom of the existing file. Do NOT rewrite the file — append only.

```ts
// Add to clubPaymentsKeys object (extend the existing export):
// clubMemberPayments: (clubId: string, year?: number) =>
//   [...clubPaymentsKeys.all, 'club-member-payments', clubId, year] as const,

// NEW hook (add at the bottom of the file):
import { paymentAdminService } from '../../data/services/payment-admin.service';

export const useClubMemberPaymentsQuery = (
  clubId: string,
  paymentYear?: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: clubPaymentsKeys.clubMemberPayments(clubId, paymentYear),
    queryFn: () => paymentAdminService.getClubMemberPayments(clubId, paymentYear),
    enabled: enabled && !!clubId,
    staleTime: 2 * 60 * 1000,
  });
};
```

The full updated `clubPaymentsKeys` object becomes:

```ts
export const clubPaymentsKeys = {
  all: ['club-payments'] as const,
  allClubsSummary: (year?: number) =>
    [...clubPaymentsKeys.all, 'all-clubs-summary', year] as const,
  clubDetail: (clubId: string, year?: number) =>
    [...clubPaymentsKeys.all, 'club-detail', clubId, year] as const,
  // NEW:
  clubMemberPayments: (clubId: string, year?: number) =>
    [...clubPaymentsKeys.all, 'club-member-payments', clubId, year] as const,
};
```

Mutations for `updateMemberPayment` and `deleteMemberPayment` should ALSO invalidate `clubPaymentsKeys.clubMemberPayments(clubId, year)` so the Transactions table refreshes automatically.

---

## 5. Components

### 5.1 New files to create

```
frontend/src/features/club-payments/components/
  ManualPaymentModal.tsx         (new)
  MemberPaymentEditModal.tsx     (new)
  ConfirmDeleteDialog.tsx        (new)
  TransactionsSection.tsx        (new)
```

### 5.2 ManualPaymentModal

**Props interface:**
```ts
interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
  paymentYear: number;
  members: Member[];          // from useMembersQuery — caller fetches
  isLoadingMembers: boolean;
}
```

**Structure (shadcn-ui-architect must style):**
- Uses `Dialog` / `DialogContent` from `@/components/ui/dialog`
- Form fields (all controlled state, no react-hook-form):
  - `payer_name` — `Input`
  - `payment_year` — `Select` (current year ±1)
  - `payment_method` — `Select` with options from `PAYMENT_METHOD_LABELS` (exclude 'redsys' — manual payments only cash/transfer/other)
  - `include_club_fee` — `Checkbox`
  - `member_assignments` — reuse `MemberSelectionTable` from `@/features/member-payments/components/MemberSelectionTable`
- Validation via `manualPaymentSchema.safeParse(formData)` on submit (same pattern as `useAnnualPaymentForm.validate()`)
- On submit: call `registerManualPayment(formData)`, then close if `isSuccess`
- Error display: inline text under the field or a banner at the top of the form

**State:**
```ts
const [formData, setFormData] = useState<ManualPaymentFormData>({
  payer_name: '',
  club_id: clubId,
  payment_year: paymentYear,
  payment_method: 'cash',
  member_assignments: [],
  include_club_fee: false,
});
const [errors, setErrors] = useState<Record<string, string>>({});
const [isMemberSelectionOpen, setIsMemberSelectionOpen] = useState(false);
```

**Risk — nested Dialog:** `MemberSelectionTable` already opens as a `Dialog`. Nesting two Radix `Dialog`s requires setting `modal={false}` on the inner one or using a different approach. Recommend `shadcn-ui-architect` to decide the nesting strategy. An alternative is to embed the member table directly (not in a dialog) inside the `ManualPaymentModal` using `ScrollArea` so no nesting occurs.

### 5.3 MemberPaymentEditModal

**Props interface:**
```ts
interface MemberPaymentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberPayment: MemberPayment;   // from member-payment.schema.ts
  clubId: string;
  paymentYear: number;
}
```

**Structure:**
- Uses `Dialog` / `DialogContent`
- Editable fields: `payment_type` (Select from MEMBER_PAYMENT_TYPES), `concept` (Input), `amount` (Input type=number), `status` (Select from MEMBER_PAYMENT_STATUS)
- Validation via `memberPaymentUpdateSchema.safeParse()`
- On submit: `updateMemberPayment({ id: memberPayment.id, data: formData })`
- Close on `isSuccess`

### 5.4 ConfirmDeleteDialog

Generic reusable confirm/delete for both Payment (with `force` flag) and MemberPayment.

**Props interface:**
```ts
interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  title: string;
  description: string;
  requiresForce?: boolean;   // true when deleting a Redsys COMPLETED payment
}
```

**Structure:**
- Uses `AlertDialog` from `@/components/ui/alert-dialog`
- When `requiresForce=true`, show a `Checkbox` "Confirmo que quiero eliminar un pago procesado por Redsys" managed by local state. Confirm button disabled until checkbox checked.
- Confirm button: `variant="destructive"`
- Cancel calls `onClose`

### 5.5 TransactionsSection

**Props interface:**
```ts
interface TransactionsSectionProps {
  clubId: string;
  paymentYear: number;
}
```

**Structure:**
- Calls `useClubMemberPaymentsQuery(clubId, paymentYear)` to get all `MemberPayment` lines
- Groups lines by `payment_id` in the component to show per-transaction rows, or displays flat line list — TBD by shadcn-ui-architect based on UX preference
- Desktop: `Table` component with columns: Miembro, Concepto, Tipo, Importe, Estado, Método, Acciones
- Mobile: card list (same pattern as ClubPaymentDetail member cards)
- Actions per row (always shown — TransactionsSection is only rendered when `canManagePayments`):
  - Edit button (Pencil icon) — opens `MemberPaymentEditModal` (local state)
  - Delete button (Trash2 icon) — opens `ConfirmDeleteDialog` (local state)
  - Redsys COMPLETED rows: edit button disabled, delete opens `ConfirmDeleteDialog` with `requiresForce=true`
- Local state: `editingItem: MemberPayment | null`, `deletingId: string | null`, `forceDelete: boolean`
- Uses `useUpdateMemberPaymentMutation(clubId, paymentYear)` and `useDeleteMemberPaymentMutation(clubId, paymentYear)`

---

## 6. Integration into ClubPaymentDetail.tsx

The following describes EXACT changes to `ClubPaymentDetail.tsx`. Line numbers reference the current file (258 lines total).

### 6.1 New imports to add (top of file, after existing imports)

```ts
import { usePermissions } from '@/core/hooks/usePermissions';
import { useMembersQuery } from '@/features/members/hooks/queries/useMemberQueries';
import { ManualPaymentModal } from './ManualPaymentModal';
import { TransactionsSection } from './TransactionsSection';
import { Plus } from 'lucide-react';  // add to existing Lucide import
```

`useMembersQuery` import path confirmed from `useAnnualPaymentContext.tsx`:
`@/features/members/hooks/queries/useMemberQueries`

### 6.2 New state inside `ClubPaymentDetail` component body

Add after the existing `useState` calls (currently lines 29-30):

```ts
const { isAssociationAdmin } = usePermissions();
const canManagePayments = isAssociationAdmin();

const [isManualPaymentOpen, setIsManualPaymentOpen] = useState(false);

// Members for the manual payment modal — only fetch when super_admin
const { data: membersData, isLoading: isLoadingMembers } = useMembersQuery(
  { club_id: clubDetail?.club_id ?? '', status: 'active', limit: 0 },
  { enabled: canManagePayments && !!clubDetail?.club_id }
);
const members = membersData ?? [];
```

Also need `selectedYear` from context for passing to `ManualPaymentModal`:
```ts
const { isSuperAdmin, clubDetail, isLoadingClubDetail, clubDetailError, goBackToList, selectedYear } = useClubPaymentsContext();
```
`selectedYear` is already on the context type — just destructure it.

### 6.3 "Registrar pago manual" button placement

Insert between the club name block (current lines 81–84) and the summary cards grid (current line 87).

```tsx
{/* Admin actions bar */}
{canManagePayments && (
  <div className="flex justify-end">
    <Button
      onClick={() => setIsManualPaymentOpen(true)}
      className="gap-2"
    >
      <Plus className="w-4 h-4" />
      Registrar pago manual
    </Button>
  </div>
)}
```

### 6.4 TransactionsSection placement

Add after the closing `</div>` of the desktop table wrapper (current line ~245), before the empty state div (current line ~247):

```tsx
{/* Transactions section — super_admin only */}
{canManagePayments && clubDetail && (
  <div className="mt-8">
    <h4 className="text-base font-semibold text-gray-900 mb-4">Transacciones</h4>
    <TransactionsSection
      clubId={clubDetail.club_id}
      paymentYear={selectedYear}
    />
  </div>
)}
```

### 6.5 ManualPaymentModal at the bottom of the return (before final `</div>`)

```tsx
{/* Manual Payment Modal */}
{canManagePayments && clubDetail && (
  <ManualPaymentModal
    isOpen={isManualPaymentOpen}
    onClose={() => setIsManualPaymentOpen(false)}
    clubId={clubDetail.club_id}
    clubName={clubDetail.club_name}
    paymentYear={selectedYear}
    members={members}
    isLoadingMembers={isLoadingMembers}
  />
)}
```

### 6.6 Architecture decision: no per-member-row actions in the existing summary table

The existing members table shows `MemberPaymentSummary` (aggregated, no individual payment IDs). Adding inline edit/delete there would require fetching all `MemberPayment` lines and joining. The recommended approach is:

- Keep the existing aggregated summary table as-is.
- `TransactionsSection` contains the editable payment lines with full IDs.
- This keeps `ClubPaymentDetail` modification minimal and the concerns separated.

---

## 7. Permission Gating

```ts
const { isAssociationAdmin } = usePermissions();
const canManagePayments = isAssociationAdmin();
```

Pattern:
- "Registrar pago manual" button wrapped in `{canManagePayments && ...}`
- `TransactionsSection` wrapped in `{canManagePayments && ...}`
- `ManualPaymentModal` wrapped in `{canManagePayments && ...}`
- Mutation hooks are called unconditionally (React rules of hooks) but only invoked via user actions that are already gated
- Backend re-validates with `require_super_admin` — frontend gating is UX only

---

## 8. Context updates (useClubPaymentsContext.tsx)

The context does NOT need structural changes. Expose `selectedYear` in the destructure in `ClubPaymentDetail` — it is already in `ClubPaymentsContextType`.

---

## 9. index.ts — exports to add

In `frontend/src/features/club-payments/index.ts`, add:

```ts
export { ManualPaymentModal } from './components/ManualPaymentModal';
export { MemberPaymentEditModal } from './components/MemberPaymentEditModal';
export { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog';
export { TransactionsSection } from './components/TransactionsSection';
export * from './data/schemas/payment-admin.schema';
export { paymentAdminService } from './data/services/payment-admin.service';
```

---

## 10. Test Plan

### 10.1 Test file locations

Follow the `__tests__` subdirectory pattern used in auth:

```
frontend/src/features/club-payments/
  hooks/__tests__/
    mutations/
      usePaymentAdminMutations.test.ts     (all 5 mutation hooks in one file)
    queries/
      useClubMemberPaymentsQuery.test.ts
  data/__tests__/
    payment-admin.schema.test.ts
    payment-admin.service.test.ts
  components/__tests__/
    ManualPaymentModal.test.tsx
    MemberPaymentEditModal.test.tsx
    ConfirmDeleteDialog.test.tsx
    TransactionsSection.test.tsx
    ClubPaymentDetail.admin.test.tsx
```

### 10.2 Test setup — wrapper pattern

All hook tests (same as `useLoginMutation.test.tsx`):

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'

vi.mock('@/features/club-payments/data/services/payment-admin.service')

const createWrapper = (queryClient: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
```

Component tests that need `ClubPaymentsContext` must use `renderWithProviders` from `@/test-utils/render` with `withAuth: true`.

### 10.3 Mock for usePermissions in component tests

```ts
vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({ isAssociationAdmin: () => true }))
}))
```

For role-gating tests:
```ts
vi.mocked(usePermissions).mockReturnValue({ isAssociationAdmin: () => false })
```

### 10.4 Mutation hook unit tests (`usePaymentAdminMutations.test.ts`)

For each of the 5 exported hooks, verify:

1. **Return shape:** has correct property names (`registerManualPayment`/`updatePayment`/`deletePayment`/`updateMemberPayment`/`deleteMemberPayment`, `isLoading`, `error`, `isSuccess`)
2. **Success path:** service called with correct args, `toast.success` fired, `queryClient.invalidateQueries` called with `['club-payments', 'club-detail', clubId, year]` and `['club-payments', 'all-clubs-summary', year]`
3. **Error path:** service rejects with `{ detail: 'mensaje' }`, `toast.error` fired with that message
4. **Error fallback:** service rejects without `.detail`, toast shows the generic message

For `useDeletePaymentMutation` specifically:
- `{ id, force: undefined }` → service called with `force = false` (default)
- `{ id, force: true }` → service called with `force = true`

### 10.5 Schema tests (`payment-admin.schema.test.ts`)

```
manualPaymentSchema:
  - valid data passes
  - empty payer_name fails with message
  - empty member_assignments array fails
  - payment_year < 1900 fails
  - invalid payment_method string fails
  - 'redsys' as payment_method passes (schema allows it, UI restricts it)

paymentUpdateSchema:
  - empty object passes (all optional)
  - negative amount fails
  - year out of range fails
  - invalid payment_method fails

memberPaymentUpdateSchema:
  - empty object passes
  - negative amount fails
```

### 10.6 Component tests

**`ConfirmDeleteDialog.test.tsx`:**
- `requiresForce=false`: confirm button enabled immediately
- `requiresForce=true`: confirm button disabled until internal checkbox checked
- Clicking enabled confirm calls `onConfirm`
- `isLoading=true` disables both buttons

**`ManualPaymentModal.test.tsx`:**
- Does not render when `isOpen=false`
- Renders form when `isOpen=true`
- Submit with empty `payer_name` shows validation error, does NOT call service
- Submit with empty `member_assignments` shows validation error
- Submit with valid data calls `registerManualPayment` service
- `onClose` called when Cancel clicked
- `isLoadingMembers=true` shows loading indicator in member section

**`ClubPaymentDetail.admin.test.tsx` (role gating):**
- When `isAssociationAdmin()` returns `false`: "Registrar pago manual" button NOT in document, `TransactionsSection` NOT in document
- When `isAssociationAdmin()` returns `true`: button IS in document, `TransactionsSection` IS in document
- Clicking "Registrar pago manual" opens `ManualPaymentModal` (dialog appears)

**`TransactionsSection.test.tsx`:**
- Renders loading skeleton while `useClubMemberPaymentsQuery` is loading
- Renders table rows for each `MemberPayment` returned
- Edit button click opens `MemberPaymentEditModal`
- Delete button click opens `ConfirmDeleteDialog`
- Redsys COMPLETED row: edit button disabled (`disabled` attribute present)
- Redsys COMPLETED row: delete opens dialog with `requiresForce` indicator

---

## 11. Risk Register

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Nested Radix Dialog (`MemberSelectionTable` inside `ManualPaymentModal`) | shadcn-ui-architect must decide: embed table inline with `ScrollArea` (preferred, no nesting), or use `modal={false}` on inner Dialog |
| 2 | `GET /api/v1/member-payments/club/{club_id}` endpoint return shape | If backend returns a paginated wrapper object instead of raw array, adjust service return type. Verify shape before implementing `getClubMemberPayments`. |
| 3 | No `form.tsx` (react-hook-form) in `ui/` | Use controlled state + `safeParse` as done in `useAnnualPaymentForm.ts`. Do NOT introduce react-hook-form. |
| 4 | `useMembersQuery` import path | Confirmed: `@/features/members/hooks/queries/useMemberQueries` — used in `useAnnualPaymentContext.tsx` |
| 5 | `ApiError` type for mutation `onError` | `apiClient.ts` throws a plain object `{ message, detail, status }`, NOT an `Error` instance. Type `onError` arg as `{ detail?: string; message?: string }` — do NOT use `(error: Error)` |
| 6 | `toast` import | `import { toast } from 'sonner'` — confirmed in `useInitiateAnnualPayment.mutation.ts` |
| 7 | Query key mismatch on invalidation | Import `clubPaymentsKeys` from `hooks/queries/useClubPaymentsQueries.ts`. Never hardcode the array literal. |
| 8 | `selectedYear` not destructured in ClubPaymentDetail | Currently the component destructures `{ isSuperAdmin, clubDetail, isLoadingClubDetail, clubDetailError, goBackToList }`. Add `selectedYear` to the destructure — it is already on the context type. |
| 9 | `payment_method` field missing from existing Payment entity | Backend must add this field before frontend can display it in TransactionsSection. Coordinate with backend team. |

---

## 12. Files created / modified summary

| Path | Action |
|------|--------|
| `frontend/src/features/club-payments/data/schemas/payment-admin.schema.ts` | CREATE |
| `frontend/src/features/club-payments/data/services/payment-admin.service.ts` | CREATE |
| `frontend/src/features/club-payments/hooks/mutations/usePaymentAdminMutations.ts` | CREATE (new dir) |
| `frontend/src/features/club-payments/hooks/queries/useClubPaymentsQueries.ts` | MODIFY — add `clubMemberPayments` key + `useClubMemberPaymentsQuery` |
| `frontend/src/features/club-payments/components/ManualPaymentModal.tsx` | CREATE |
| `frontend/src/features/club-payments/components/MemberPaymentEditModal.tsx` | CREATE |
| `frontend/src/features/club-payments/components/ConfirmDeleteDialog.tsx` | CREATE |
| `frontend/src/features/club-payments/components/TransactionsSection.tsx` | CREATE |
| `frontend/src/features/club-payments/components/ClubPaymentDetail.tsx` | MODIFY |
| `frontend/src/features/club-payments/index.ts` | MODIFY — add new exports |
| `frontend/src/features/club-payments/hooks/__tests__/mutations/usePaymentAdminMutations.test.ts` | CREATE |
| `frontend/src/features/club-payments/hooks/__tests__/queries/useClubMemberPaymentsQuery.test.ts` | CREATE |
| `frontend/src/features/club-payments/data/__tests__/payment-admin.schema.test.ts` | CREATE |
| `frontend/src/features/club-payments/data/__tests__/payment-admin.service.test.ts` | CREATE |
| `frontend/src/features/club-payments/components/__tests__/ManualPaymentModal.test.tsx` | CREATE |
| `frontend/src/features/club-payments/components/__tests__/MemberPaymentEditModal.test.tsx` | CREATE |
| `frontend/src/features/club-payments/components/__tests__/ConfirmDeleteDialog.test.tsx` | CREATE |
| `frontend/src/features/club-payments/components/__tests__/TransactionsSection.test.tsx` | CREATE |
| `frontend/src/features/club-payments/components/__tests__/ClubPaymentDetail.admin.test.tsx` | CREATE |
