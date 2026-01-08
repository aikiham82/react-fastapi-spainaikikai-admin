# Plan de Implementación - Frontend Backoffice Aikido

## Overview

Este documento detalla el plan de implementación del frontend backoffice para el sistema de gestión de asociación de Aikido.

## Stack Tecnológico

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS v4
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: React Context API
- **Data Fetching**: React Query (TanStack Query)
- **Routing**: React Router v7
- **Forms**: React Hook Form
- **Validation**: Zod
- **API Client**: Axios con interceptores
- **Notifications**: Sonner
- **Excel Handling**: xlsx (SheetJS)

## Arquitectura de Features

Cada feature sigue esta estructura:

```
src/features/{feature}/
├── components/
│   ├── ComponentName.tsx
│   └── __tests__/
└── hooks/
    ├── use{Feature}Context.tsx
    ├── queries/
    │   ├── use{Entity}Query.ts
    │   └── __tests__/
    ├── mutations/
    │   ├── use{Action}Mutation.ts
    │   └── __tests__/
    └── __tests__/
```

## Roles y Permisos

### Tipos de Roles
- `association_admin`: Administrador de la asociación (acceso completo)
- `club_admin`: Administrador de un club (acceso limitado a su club)

### Implementación de Permisos

#### 1. Extender AuthContext

```typescript
// features/auth/hooks/useAuthContext.tsx
interface AuthContextType {
  // ... existing properties
  userRole: 'association_admin' | 'club_admin' | null;
  clubId: string | null;
  canAccess: (resource: string, action: string) => boolean;
}
```

#### 2. Crear Hook usePermissions

```typescript
// src/core/hooks/usePermissions.ts
export const usePermissions = () => {
  const { userRole, clubId } = useAuthContext();

  const canAccess = (resource: string, action: string): boolean => {
    if (userRole === 'association_admin') return true;
    if (userRole === 'club_admin') {
      // Club admin can access their club's resources
      return true;
    }
    return false;
  };

  return { canAccess, userRole, clubId };
};
```

#### 3. Componente ProtectedRoute

```typescript
// src/components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: ('association_admin' | 'club_admin')[];
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallback = <Navigate to="/unauthorized" />
}) => {
  const { userRole, isAuthenticated } = useAuthContext();

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!userRole || !allowedRoles.includes(userRole)) return fallback;

  return <>{children}</>;
};
```

## Layout Principal

### Componentes del Layout

#### 1. AppLayout

```typescript
// src/components/AppLayout.tsx
export const AppLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthContext();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
```

#### 2. Sidebar

```typescript
// src/components/Sidebar.tsx
interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
  roles: ('association_admin' | 'club_admin')[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', path: '/', icon: Home, roles: ['association_admin', 'club_admin'] },
  { title: 'Clubs', path: '/clubs', icon: Building2, roles: ['association_admin'] },
  { title: 'Members', path: '/members', icon: Users, roles: ['association_admin', 'club_admin'] },
  { title: 'Licenses', path: '/licenses', icon: IdCard, roles: ['association_admin', 'club_admin'] },
  { title: 'Payments', path: '/payments', icon: CreditCard, roles: ['association_admin', 'club_admin'] },
  { title: 'Seminars', path: '/seminars', icon: Calendar, roles: ['association_admin', 'club_admin'] },
  { title: 'Insurance', path: '/insurance', icon: Shield, roles: ['association_admin', 'club_admin'] },
  { title: 'Import/Export', path: '/import-export', icon: FileSpreadsheet, roles: ['association_admin', 'club_admin'] },
];
```

## Features Detalladas

### 1. Feature: Clubs

#### Estructura de Archivos

```
src/features/clubs/
├── components/
│   ├── ClubList.tsx
│   ├── ClubCard.tsx
│   ├── ClubForm.tsx
│   ├── ClubDetails.tsx
│   ├── ClubLicenseList.tsx
│   └── __tests__/
├── data/
│   ├── schemas/
│   │   └── club.schema.ts
│   └── services/
│       └── club.service.ts
└── hooks/
    ├── useClubContext.tsx
    ├── queries/
    │   ├── useClubsQuery.ts
    │   ├── useClubQuery.ts
    │   ├── useClubLicensesQuery.ts
    │   └── __tests__/
    └── mutations/
        ├── useCreateClubMutation.ts
        ├── useUpdateClubMutation.ts
        ├── useDeleteClubMutation.ts
        └── __tests__/
```

#### Schema (club.schema.ts)

```typescript
export interface Club {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  website?: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface CreateClubRequest {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  website?: string;
}

export interface UpdateClubRequest extends Partial<CreateClubRequest> {}

export interface ClubFilters {
  search?: string;
  city?: string;
}
```

#### Service (club.service.ts)

```typescript
import { apiClient } from '@/core/data/apiClient';
import type { Club, CreateClubRequest, UpdateClubRequest, ClubFilters } from './club.schema';

const BASE_URL = '/api/v1/clubs';

export const clubService = {
  getClubs: async (filters?: ClubFilters): Promise<Club[]> => {
    return await apiClient.get<Club[]>(BASE_URL, { params: filters });
  },

  getClub: async (id: string): Promise<Club> => {
    return await apiClient.get<Club>(`${BASE_URL}/${id}`);
  },

  createClub: async (data: CreateClubRequest): Promise<Club> => {
    return await apiClient.post<Club>(BASE_URL, data);
  },

  updateClub: async (id: string, data: UpdateClubRequest): Promise<Club> => {
    return await apiClient.put<Club>(`${BASE_URL}/${id}`, data);
  },

  deleteClub: async (id: string): Promise<void> => {
    return await apiClient.delete<void>(`${BASE_URL}/${id}`);
  },

  getClubLicenses: async (clubId: string): Promise<License[]> => {
    return await apiClient.get<License[]>(`${BASE_URL}/${clubId}/licenses`);
  },
};
```

#### Context (useClubContext.tsx)

```typescript
interface ClubContextType {
  clubs: Club[];
  selectedClub: Club | null;
  isLoading: boolean;
  error: Error | null;
  filters: ClubFilters;
  createClub: (data: CreateClubRequest) => void;
  updateClub: (id: string, data: UpdateClubRequest) => void;
  deleteClub: (id: string) => void;
  selectClub: (club: Club | null) => void;
  setFilters: (filters: ClubFilters) => void;
}
```

#### Componentes Principales

**ClubList.tsx**
- Tabla con paginación y filtros
- Actions: View, Edit, Delete
- Search por nombre o ciudad
- Responsive: Cards en móvil, tabla en desktop

**ClubForm.tsx**
- Formulario con validación
- Campos: nombre, dirección, ciudad, CP, teléfono, email, website
- Submit button con loading state
- Error handling con toast

**ClubDetails.tsx**
- Información detallada del club
- Lista de licencias asociadas
- Actions: Edit, Back to list

### 2. Feature: Members

#### Estructura de Archivos

```
src/features/members/
├── components/
│   ├── MemberList.tsx
│   ├── MemberTable.tsx
│   ├── MemberForm.tsx
│   ├── MemberDetails.tsx
│   ├── MemberFilters.tsx
│   └── __tests__/
├── data/
│   ├── schemas/
│   │   └── member.schema.ts
│   └── services/
│       └── member.service.ts
└── hooks/
    ├── useMemberContext.tsx
    ├── queries/
    │   ├── useMembersQuery.ts
    │   ├── useMemberQuery.ts
    │   └── __tests__/
    └── mutations/
        ├── useCreateMemberMutation.ts
        ├── useUpdateMemberMutation.ts
        ├── useDeleteMemberMutation.ts
        ├── useImportMembersMutation.ts
        ├── useExportMembersMutation.ts
        └── __tests__/
```

#### Schema (member.schema.ts)

```typescript
export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  city: string;
  postal_code: string;
  license_number?: string;
  license_status: 'active' | 'expired' | 'pending';
  club_id: string;
  club_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMemberRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  city: string;
  postal_code: string;
  club_id: string;
}

export interface UpdateMemberRequest extends Partial<CreateMemberRequest> {}

export interface MemberFilters {
  search?: string;
  club_id?: string;
  license_status?: 'active' | 'expired' | 'pending';
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}
```

#### Import/Export

**UseMembersImportMutation.ts**

```typescript
import { useMutation } from '@tanstack/react-query';
import { memberService } from '../../data/member.service';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export const useImportMembersMutation = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      return await memberService.importMembers(jsonData);
    },
    onSuccess: (data) => {
      toast.success(`${data.length} members imported successfully`);
    },
    onError: (error) => {
      toast.error('Failed to import members');
    },
  });
};
```

### 3. Feature: Licenses

#### Schema (license.schema.ts)

```typescript
export interface License {
  id: string;
  license_number: string;
  member_id: string;
  member_name?: string;
  club_id: string;
  issue_date: string;
  expiry_date: string;
  status: 'active' | 'expired' | 'pending';
  dan_grade: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLicenseRequest {
  member_id: string;
  issue_date: string;
  expiry_date: string;
  dan_grade: number;
}

export interface UpdateLicenseRequest extends Partial<CreateLicenseRequest> {}

export interface LicenseFilters {
  member_id?: string;
  club_id?: string;
  status?: 'active' | 'expired' | 'pending';
  expiring_soon?: boolean;
}
```

### 4. Feature: Payments

#### Schema (payment.schema.ts)

```typescript
export interface Payment {
  id: string;
  member_id: string;
  member_name?: string;
  club_id: string;
  payment_type: 'license' | 'accident_insurance' | 'rc_insurance' | 'annual_fee' | 'seminar';
  amount: number;
  payment_date: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: 'card' | 'bank_transfer' | 'cash';
  redsys_transaction_id?: string;
  seminar_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentRequest {
  member_id: string;
  payment_type: PaymentType;
  amount: number;
  seminar_id?: string;
}

export interface UpdatePaymentStatusRequest {
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

export interface PaymentFilters {
  member_id?: string;
  club_id?: string;
  payment_type?: PaymentType;
  status?: PaymentStatus;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}
```

#### Redsys Integration

**useCreatePaymentMutation.ts**

```typescript
export const useCreatePaymentMutation = () => {
  return useMutation({
    mutationFn: async (data: CreatePaymentRequest) => {
      const response = await paymentService.createPayment(data);
      if (response.redsys_url) {
        // Redirect to Redsys payment page
        window.location.href = response.redsys_url;
      }
      return response;
    },
    onSuccess: () => {
      toast.success('Payment initiated');
    },
    onError: (error) => {
      toast.error('Failed to create payment');
    },
  });
};
```

### 5. Feature: Seminars

#### Schema (seminar.schema.ts)

```typescript
export interface Seminar {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  max_participants?: number;
  current_participants: number;
  price: number;
  instructor?: string;
  image_url?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CreateSeminarRequest {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  max_participants?: number;
  price: number;
  instructor?: string;
  image_url?: string;
}

export interface RegisterMemberRequest {
  seminar_id: string;
  member_id: string;
}
```

### 6. Feature: Insurance

#### Schema (insurance.schema.ts)

```typescript
export interface Insurance {
  id: string;
  member_id: string;
  member_name?: string;
  insurance_type: 'accident' | 'rc';
  policy_number: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired';
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface CreateInsuranceRequest {
  member_id: string;
  insurance_type: 'accident' | 'rc';
  start_date: string;
  end_date: string;
  amount: number;
}
```

## Componentes UI Compartidos

### 1. DataTable Component

```typescript
// src/components/ui/DataTable.tsx
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  pagination?: PaginationConfig;
  filters?: FilterConfig[];
}

interface Column<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  render?: (value: any, row: T) => ReactNode;
}
```

### 2. Form Components

```typescript
// src/components/ui/Form.tsx
export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
  </div>
);
```

### 3. StatusBadge Component

```typescript
// src/components/ui/StatusBadge.tsx
interface StatusBadgeProps {
  status: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
    {status}
  </span>
);
```

## Testing Strategy

### Unit Tests
- Componentes: React Testing Library
- Hooks: Testing hooks con React Query
- Services: Mock axios con vi

### Integration Tests
- Flujos completos de usuario
- Navegación entre features
- Integración con API (mockeada)

### E2E Tests
- Playwright para tests end-to-end
- Escenarios críticos de negocio

## Responsive Design

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Adaptive Patterns
- **Mobile**: Cards con información condensada, drawer navigation
- **Tablet**: Simplified tables, collapsible sidebar
- **Desktop**: Full tables, fixed sidebar

## Performance Optimization

### React Query Optimizations
- Stale time apropiado para cada query
- Refetch on window focus solo para datos críticos
- Pagination para datasets grandes

### Code Splitting
- Lazy loading de features con React.lazy
- Route-based code splitting

### Bundle Optimization
- Tree shaking de imports
- Minificar y comprimir assets

## Security

### Authentication
- JWT tokens en localStorage con httpOnly cookies como fallback
- Auto-refresh de tokens antes de expiración
- Logout automático en 401

### Authorization
- Role-based access control (RBAC)
- Server-side validation para todas las operaciones
- Permission checks en UI para feedback inmediato

### Data Protection
- HTTPS en producción
- Sanitización de inputs
- CSP headers configurados

## Dependencies

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "react-router-dom": "^7.0.0",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "sonner": "^1.4.0",
    "xlsx": "^0.18.5",
    "date-fns": "^3.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

## Próximos Pasos

1. Configurar autenticación con roles
2. Implementar layout principal
3. Crear feature de Clubs
4. Crear feature de Members
5. Crear feature de Licenses
6. Crear feature de Payments
7. Crear feature de Seminars
8. Crear feature de Insurance
9. Implementar Import/Export
10. Testing y validación QA
