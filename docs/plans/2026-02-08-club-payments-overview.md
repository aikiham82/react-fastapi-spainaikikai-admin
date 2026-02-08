# Club Payments Overview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a "Pagos" section where Super Admins see payment summaries across all clubs, and Club Admins see their club's payment detail — both for a selectable year.

**Architecture:** New backend endpoint aggregates payment summaries for all clubs in a single API call. New frontend feature `club-payments` follows existing feature-based patterns (service → schema → query → context → components). Page adapts based on user role.

**Tech Stack:** FastAPI, MongoDB aggregation, React 19, React Query, TailwindCSS, Radix UI, Zod, lucide-react

---

### Task 1: Backend — Create GetAllClubsPaymentSummaryUseCase

**Files:**
- Create: `backend/src/application/use_cases/member_payment/get_all_clubs_payment_summary_use_case.py`

**Step 1: Create the use case file**

```python
"""Get All Clubs Payment Summary use case."""

from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

from src.domain.entities.member_payment import MemberPaymentStatus
from src.application.ports.member_payment_repository import MemberPaymentRepositoryPort
from src.application.ports.club_repository import ClubRepositoryPort
from src.application.ports.member_repository import MemberRepositoryPort


@dataclass
class ClubSummaryItem:
    """Summary for a single club."""
    club_id: str
    club_name: str
    total_members: int
    members_with_license: int
    members_with_insurance: int
    total_collected: float
    has_club_fee: bool


@dataclass
class AllClubsPaymentSummaryResult:
    """Result containing payment summaries for all clubs."""
    payment_year: int
    clubs: List[ClubSummaryItem]
    grand_total_collected: float
    grand_total_members: int


class GetAllClubsPaymentSummaryUseCase:
    """Use case for getting payment summaries across all clubs."""

    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        club_repository: ClubRepositoryPort,
        member_repository: MemberRepositoryPort
    ):
        self.member_payment_repository = member_payment_repository
        self.club_repository = club_repository
        self.member_repository = member_repository

    async def execute(
        self,
        payment_year: Optional[int] = None
    ) -> AllClubsPaymentSummaryResult:
        if payment_year is None:
            payment_year = datetime.now().year

        # Get all active clubs
        clubs = await self.club_repository.find_all()

        club_summaries = []
        grand_total = 0.0
        grand_total_members = 0

        for club in clubs:
            if not club.id or not club.is_active:
                continue

            members = await self.member_repository.find_by_club_id(club.id)
            total_members = len(members)
            member_ids = [m.id for m in members if m.id]

            if not member_ids:
                club_summaries.append(ClubSummaryItem(
                    club_id=club.id,
                    club_name=club.name,
                    total_members=0,
                    members_with_license=0,
                    members_with_insurance=0,
                    total_collected=0.0,
                    has_club_fee=False,
                ))
                continue

            summary = await self.member_payment_repository.get_summary_by_member_ids(
                member_ids=member_ids,
                payment_year=payment_year
            )

            payments = await self.member_payment_repository.find_by_member_ids_year(
                member_ids=member_ids,
                payment_year=payment_year,
                status=MemberPaymentStatus.COMPLETED
            )

            members_with_license = 0
            members_with_insurance = 0
            paid_member_ids = set()

            for payment in payments:
                paid_member_ids.add(payment.member_id)
                if payment.is_license_payment:
                    members_with_license += 1
                if payment.is_insurance_payment:
                    members_with_insurance += 1

            # Deduplicate: count unique members with license/insurance
            license_members = set()
            insurance_members = set()
            for payment in payments:
                if payment.is_license_payment:
                    license_members.add(payment.member_id)
                if payment.is_insurance_payment:
                    insurance_members.add(payment.member_id)

            total_collected = summary.get("total_amount", 0.0)

            club_summaries.append(ClubSummaryItem(
                club_id=club.id,
                club_name=club.name,
                total_members=total_members,
                members_with_license=len(license_members),
                members_with_insurance=len(insurance_members),
                total_collected=total_collected,
                has_club_fee=False,  # TODO: check from Payment records
            ))

            grand_total += total_collected
            grand_total_members += total_members

        return AllClubsPaymentSummaryResult(
            payment_year=payment_year,
            clubs=club_summaries,
            grand_total_collected=grand_total,
            grand_total_members=grand_total_members,
        )
```

**Step 2: Commit**

```bash
git add backend/src/application/use_cases/member_payment/get_all_clubs_payment_summary_use_case.py
git commit -m "feat: add GetAllClubsPaymentSummaryUseCase"
```

---

### Task 2: Backend — Add DTO, dependency, and router endpoint

**Files:**
- Modify: `backend/src/infrastructure/web/dto/member_payment_dto.py` — add new DTOs
- Modify: `backend/src/infrastructure/web/dependencies.py` — add dependency function
- Modify: `backend/src/infrastructure/web/routers/member_payments.py` — add endpoint

**Step 1: Add DTOs to `member_payment_dto.py`**

Add at the end of the file (after `UnpaidMembersResponse`):

```python
class ClubSummaryItemResponse(BaseModel):
    """DTO for a single club's payment summary."""
    club_id: str
    club_name: str
    total_members: int
    members_with_license: int
    members_with_insurance: int
    total_collected: float
    has_club_fee: bool


class AllClubsPaymentSummaryResponse(BaseModel):
    """DTO for all clubs payment summary response."""
    payment_year: int
    clubs: List[ClubSummaryItemResponse]
    grand_total_collected: float
    grand_total_members: int
```

**Step 2: Add dependency to `dependencies.py`**

Add import at top:
```python
from src.application.use_cases.member_payment.get_all_clubs_payment_summary_use_case import GetAllClubsPaymentSummaryUseCase
```

Add function at end:
```python
@lru_cache()
def get_all_clubs_payment_summary_use_case() -> GetAllClubsPaymentSummaryUseCase:
    """Get all clubs payment summary use case."""
    return GetAllClubsPaymentSummaryUseCase(
        member_payment_repository=get_member_payment_repository(),
        club_repository=get_club_repository(),
        member_repository=get_member_repository()
    )
```

**Step 3: Add endpoint to `member_payments.py`**

Add imports:
```python
from src.infrastructure.web.dto.member_payment_dto import (
    # ...existing imports...,
    AllClubsPaymentSummaryResponse,
    ClubSummaryItemResponse,
)
from src.infrastructure.web.dependencies import (
    # ...existing imports...,
    get_all_clubs_payment_summary_use_case,
)
from src.infrastructure.web.authorization import require_super_admin
```

Add endpoint (before the club/{club_id}/summary endpoint):
```python
@router.get("/all-clubs/summary", response_model=AllClubsPaymentSummaryResponse)
async def get_all_clubs_payment_summary(
    payment_year: Optional[int] = None,
    use_case=Depends(get_all_clubs_payment_summary_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get payment summary for all clubs. Super Admin only."""
    require_super_admin(ctx)

    result = await use_case.execute(payment_year=payment_year)

    return AllClubsPaymentSummaryResponse(
        payment_year=result.payment_year,
        clubs=[
            ClubSummaryItemResponse(
                club_id=c.club_id,
                club_name=c.club_name,
                total_members=c.total_members,
                members_with_license=c.members_with_license,
                members_with_insurance=c.members_with_insurance,
                total_collected=c.total_collected,
                has_club_fee=c.has_club_fee,
            ) for c in result.clubs
        ],
        grand_total_collected=result.grand_total_collected,
        grand_total_members=result.grand_total_members,
    )
```

**Step 4: Run backend tests**

```bash
cd backend && poetry run pytest -x -q
```

**Step 5: Commit**

```bash
git add backend/src/infrastructure/web/dto/member_payment_dto.py \
       backend/src/infrastructure/web/dependencies.py \
       backend/src/infrastructure/web/routers/member_payments.py
git commit -m "feat: add all-clubs payment summary endpoint (Super Admin)"
```

---

### Task 3: Frontend — Schema and Service

**Files:**
- Create: `frontend/src/features/club-payments/data/schemas/club-payments.schema.ts`
- Create: `frontend/src/features/club-payments/data/services/club-payments.service.ts`

**Step 1: Create schema file**

```typescript
import { z } from 'zod';

export const clubSummaryItemSchema = z.object({
  club_id: z.string(),
  club_name: z.string(),
  total_members: z.number(),
  members_with_license: z.number(),
  members_with_insurance: z.number(),
  total_collected: z.number(),
  has_club_fee: z.boolean(),
});

export type ClubSummaryItem = z.infer<typeof clubSummaryItemSchema>;

export const allClubsPaymentSummarySchema = z.object({
  payment_year: z.number(),
  clubs: z.array(clubSummaryItemSchema),
  grand_total_collected: z.number(),
  grand_total_members: z.number(),
});

export type AllClubsPaymentSummaryResponse = z.infer<typeof allClubsPaymentSummarySchema>;
```

**Step 2: Create service file**

```typescript
import { apiClient } from '@/core/data/apiClient';
import type { AllClubsPaymentSummaryResponse } from '../schemas/club-payments.schema';
import type { ClubPaymentSummaryResponse } from '@/features/member-payments/data/schemas/member-payment.schema';

const MEMBER_PAYMENTS_URL = '/api/v1/member-payments';

export const getAllClubsPaymentSummary = async (
  paymentYear?: number
): Promise<AllClubsPaymentSummaryResponse> => {
  const params = paymentYear ? { payment_year: paymentYear } : undefined;
  return await apiClient.get<AllClubsPaymentSummaryResponse>(
    `${MEMBER_PAYMENTS_URL}/all-clubs/summary`,
    { params }
  );
};

export const getClubPaymentSummary = async (
  clubId: string,
  paymentYear?: number
): Promise<ClubPaymentSummaryResponse> => {
  const params = paymentYear ? { payment_year: paymentYear } : undefined;
  return await apiClient.get<ClubPaymentSummaryResponse>(
    `${MEMBER_PAYMENTS_URL}/club/${clubId}/summary`,
    { params }
  );
};

export const clubPaymentsService = {
  getAllClubsPaymentSummary,
  getClubPaymentSummary,
};
```

**Step 3: Commit**

```bash
git add frontend/src/features/club-payments/
git commit -m "feat: add club-payments schema and service"
```

---

### Task 4: Frontend — Query Hooks

**Files:**
- Create: `frontend/src/features/club-payments/hooks/queries/useClubPaymentsQueries.ts`

**Step 1: Create query hooks**

```typescript
import { useQuery } from '@tanstack/react-query';
import { clubPaymentsService } from '../../data/services/club-payments.service';

export const clubPaymentsKeys = {
  all: ['club-payments'] as const,
  allClubsSummary: (year?: number) =>
    [...clubPaymentsKeys.all, 'all-clubs-summary', year] as const,
  clubDetail: (clubId: string, year?: number) =>
    [...clubPaymentsKeys.all, 'club-detail', clubId, year] as const,
};

export const useAllClubsPaymentSummaryQuery = (
  paymentYear?: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: clubPaymentsKeys.allClubsSummary(paymentYear),
    queryFn: () => clubPaymentsService.getAllClubsPaymentSummary(paymentYear),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};

export const useClubPaymentDetailQuery = (
  clubId: string,
  paymentYear?: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: clubPaymentsKeys.clubDetail(clubId, paymentYear),
    queryFn: () => clubPaymentsService.getClubPaymentSummary(clubId, paymentYear),
    enabled: enabled && !!clubId,
    staleTime: 2 * 60 * 1000,
  });
};
```

**Step 2: Commit**

```bash
git add frontend/src/features/club-payments/hooks/
git commit -m "feat: add club-payments query hooks"
```

---

### Task 5: Frontend — Context Provider

**Files:**
- Create: `frontend/src/features/club-payments/hooks/useClubPaymentsContext.tsx`

**Step 1: Create context**

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { useAllClubsPaymentSummaryQuery, useClubPaymentDetailQuery } from './queries/useClubPaymentsQueries';
import type { AllClubsPaymentSummaryResponse, ClubSummaryItem } from '../data/schemas/club-payments.schema';
import type { ClubPaymentSummaryResponse } from '@/features/member-payments/data/schemas/member-payment.schema';

interface ClubPaymentsContextType {
  // Role info
  isSuperAdmin: boolean;
  userClubId: string | null;

  // Year selector
  selectedYear: number;
  setSelectedYear: (year: number) => void;

  // All clubs summary (Super Admin)
  allClubsSummary: AllClubsPaymentSummaryResponse | undefined;
  isLoadingAllClubs: boolean;
  allClubsError: Error | null;

  // Club detail
  selectedClubId: string | null;
  selectClub: (clubId: string | null) => void;
  clubDetail: ClubPaymentSummaryResponse | undefined;
  isLoadingClubDetail: boolean;
  clubDetailError: Error | null;

  // View state
  showingDetail: boolean;
  goBackToList: () => void;
}

const ClubPaymentsContext = createContext<ClubPaymentsContextType | undefined>(undefined);

export const ClubPaymentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userRole, clubId: userClubId } = useAuthContext();
  const isSuperAdmin = userRole === 'super_admin';

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedClubId, setSelectedClubId] = useState<string | null>(
    isSuperAdmin ? null : userClubId
  );

  // All clubs summary (Super Admin only)
  const {
    data: allClubsSummary,
    isLoading: isLoadingAllClubs,
    error: allClubsError,
  } = useAllClubsPaymentSummaryQuery(selectedYear, isSuperAdmin && !selectedClubId);

  // Club detail (when a club is selected or for Club Admin)
  const activeClubId = selectedClubId || (isSuperAdmin ? null : userClubId) || '';
  const {
    data: clubDetail,
    isLoading: isLoadingClubDetail,
    error: clubDetailError,
  } = useClubPaymentDetailQuery(activeClubId, selectedYear, !!activeClubId);

  const selectClub = useCallback((clubId: string | null) => {
    setSelectedClubId(clubId);
  }, []);

  const goBackToList = useCallback(() => {
    setSelectedClubId(null);
  }, []);

  const showingDetail = isSuperAdmin ? !!selectedClubId : true;

  const value: ClubPaymentsContextType = {
    isSuperAdmin,
    userClubId,
    selectedYear,
    setSelectedYear,
    allClubsSummary,
    isLoadingAllClubs,
    allClubsError: allClubsError as Error | null,
    selectedClubId,
    selectClub,
    clubDetail,
    isLoadingClubDetail,
    clubDetailError: clubDetailError as Error | null,
    showingDetail,
    goBackToList,
  };

  return (
    <ClubPaymentsContext.Provider value={value}>
      {children}
    </ClubPaymentsContext.Provider>
  );
};

export const useClubPaymentsContext = (): ClubPaymentsContextType => {
  const context = useContext(ClubPaymentsContext);
  if (!context) {
    throw new Error('useClubPaymentsContext must be used within a ClubPaymentsProvider');
  }
  return context;
};
```

**Step 2: Commit**

```bash
git add frontend/src/features/club-payments/hooks/useClubPaymentsContext.tsx
git commit -m "feat: add club-payments context provider"
```

---

### Task 6: Frontend — AllClubsSummaryTable Component (Super Admin)

**Files:**
- Create: `frontend/src/features/club-payments/components/AllClubsSummaryTable.tsx`

**Step 1: Create the component**

Build a table showing all clubs with columns: Club, Miembros, Con Licencia, Con Seguro, Total Cobrado, and a progress indicator. Rows are clickable. Include search filter and totals row. Use Radix Table components. Show loading spinner and empty state.

Reference patterns from:
- `frontend/src/features/invoices/components/InvoiceList.tsx` (table + mobile cards + filters)
- `frontend/src/components/ui/table.tsx` (Table, TableHeader, TableRow, etc.)

**Step 2: Commit**

```bash
git add frontend/src/features/club-payments/components/AllClubsSummaryTable.tsx
git commit -m "feat: add AllClubsSummaryTable component"
```

---

### Task 7: Frontend — ClubPaymentDetail Component

**Files:**
- Create: `frontend/src/features/club-payments/components/ClubPaymentDetail.tsx`

**Step 1: Create the component**

Build a detail view with:
- Back button (Super Admin only) to return to list
- 4 summary cards: Total Cobrado, Miembros Pagados (X/Y), Licencias Activas, Seguros Activos
- Member table with columns: Miembro, Licencia (check/x), Seguro (check/x), Total Pagado, Estado
- Filter by estado (Pagado/Pendiente/Todos)
- Search by member name
- Mobile-responsive card layout

Reference `ClubPaymentSummaryResponse` type from `member-payment.schema.ts` — it has `members[]` with `member_id, member_name, license_paid, insurance_paid, total_paid`.

**Step 2: Commit**

```bash
git add frontend/src/features/club-payments/components/ClubPaymentDetail.tsx
git commit -m "feat: add ClubPaymentDetail component"
```

---

### Task 8: Frontend — Main Page Component and Feature Index

**Files:**
- Create: `frontend/src/features/club-payments/components/ClubPaymentsPage.tsx`
- Create: `frontend/src/features/club-payments/index.ts`

**Step 1: Create the main page component**

```tsx
import { useClubPaymentsContext } from '../hooks/useClubPaymentsContext';
import { AllClubsSummaryTable } from './AllClubsSummaryTable';
import { ClubPaymentDetail } from './ClubPaymentDetail';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const ClubPaymentsPage = () => {
  const { isSuperAdmin, showingDetail, selectedYear, setSelectedYear } = useClubPaymentsContext();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {showingDetail ? 'Detalle de Pagos' : 'Resumen de Pagos por Club'}
          </h2>
        </div>
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(Number(v))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conditional view */}
      {showingDetail ? <ClubPaymentDetail /> : <AllClubsSummaryTable />}
    </div>
  );
};
```

**Step 2: Create feature index**

```typescript
export { ClubPaymentsProvider, useClubPaymentsContext } from './hooks/useClubPaymentsContext';
export { ClubPaymentsPage } from './components/ClubPaymentsPage';
export { AllClubsSummaryTable } from './components/AllClubsSummaryTable';
export { ClubPaymentDetail } from './components/ClubPaymentDetail';
export * from './data/schemas/club-payments.schema';
export { clubPaymentsService } from './data/services/club-payments.service';
```

**Step 3: Commit**

```bash
git add frontend/src/features/club-payments/
git commit -m "feat: add ClubPaymentsPage and feature index"
```

---

### Task 9: Frontend — Wire Up Route, Navigation, and Header

**Files:**
- Create: `frontend/src/pages/club-payments.page.tsx`
- Modify: `frontend/src/App.tsx` — add lazy import and route
- Modify: `frontend/src/components/Sidebar.tsx` — add nav item (use `Wallet` icon from lucide-react)
- Modify: `frontend/src/components/Header.tsx` — add title mapping

**Step 1: Create page file**

```tsx
import { ClubPaymentsProvider } from '@/features/club-payments/hooks/useClubPaymentsContext';
import { ClubPaymentsPage } from '@/features/club-payments/components/ClubPaymentsPage';

export const ClubPaymentsPageRoute = () => {
  return (
    <ClubPaymentsProvider>
      <ClubPaymentsPage />
    </ClubPaymentsProvider>
  );
};
```

**Step 2: Add to `App.tsx`**

Add lazy import:
```typescript
const ClubPaymentsPageRoute = lazy(() => import("./pages/club-payments.page").then(m => ({ default: m.ClubPaymentsPageRoute })));
```

Add route inside `<Route element={<AppLayout />}>`:
```tsx
<Route path="/club-payments" element={<ClubPaymentsPageRoute />} />
```

**Step 3: Add to `Sidebar.tsx`**

Import `Wallet` from lucide-react. Add nav item after "Pagos Anuales":
```typescript
{ title: 'Pagos', path: '/club-payments', icon: Wallet, resource: 'payments' },
```

**Step 4: Add to `Header.tsx`**

Add case in `getPageTitle`:
```typescript
case '/club-payments':
  return 'Pagos';
```

**Step 5: Run frontend build to verify**

```bash
cd frontend && npm run build
```

**Step 6: Commit**

```bash
git add frontend/src/pages/club-payments.page.tsx \
       frontend/src/App.tsx \
       frontend/src/components/Sidebar.tsx \
       frontend/src/components/Header.tsx
git commit -m "feat: wire up club-payments route, nav, and header"
```

---

### Task 10: Integration Testing and QA

**Step 1: Start backend and frontend dev servers**

```bash
cd backend && poetry run uvicorn src.main:app --reload &
cd frontend && npm run dev &
```

**Step 2: Verify Super Admin flow**
- Login as Super Admin
- Navigate to "Pagos" in sidebar
- Verify all clubs table loads with correct data
- Click a club row → verify detail view shows
- Click back → verify returns to list
- Change year → verify data updates

**Step 3: Verify Club Admin flow**
- Login as Club Admin
- Navigate to "Pagos" in sidebar
- Verify detail view loads directly (no table)
- Verify member data is correct

**Step 4: Run `qa-criteria-validator` subagent for final validation**
