# Context Session: Settings Page Hardcoded Data Bug

## Issue Description
When a user logs in as `club_admin` (e.g., aikifire@hotmail.com), the Settings/Configuration page shows hardcoded data instead of the actual user's information:
- **Email shown**: admin@spainaikikai.org (hardcoded)
- **Role shown**: Administrador (hardcoded)
- **Expected email**: aikifire@hotmail.com (from logged-in user)
- **Expected role**: Admin de Club (translated from `club_admin`)

## Root Cause Analysis

### Bug Location
**File**: `frontend/src/pages/settings.page.tsx`
- **Line 36**: Hardcoded email `admin@spainaikikai.org`
- **Line 40**: Hardcoded role `Administrador`

### Current Code (Problematic)
```tsx
<div>
  <Label className="text-sm font-medium text-gray-700">Email</Label>
  <p className="text-sm text-gray-900">admin@spainaikikai.org</p>  // HARDCODED!
</div>
<div>
  <Label className="text-sm font-medium text-gray-700">Rol</Label>
  <p className="text-sm text-gray-900">Administrador</p>  // HARDCODED!
</div>
```

### Available Auth Context
The `useAuthContext` hook provides:
- `currentUser`: Object with `email`, `username`, `role`, etc.
- `userRole`: String ('association_admin' | 'club_admin')

### Reference Implementation (Sidebar.tsx)
The Sidebar already correctly uses auth context:
```tsx
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';

const roleTranslations: Record<string, string> = {
  'association_admin': 'Administrador',
  'club_admin': 'Admin de Club',
};

// In component:
const { userRole, logout } = useAuthContext();
// ...
{roleTranslations[userRole] || userRole.replace('_', ' ')}
```

## Solution

### Changes Required
1. Import `useAuthContext` from auth hooks
2. Get `currentUser` and `userRole` from the hook
3. Replace hardcoded email with `currentUser?.email ?? 'No disponible'`
4. Replace hardcoded role with translated role from `roleTranslations`

### Expected Outcome
- Email will display the actual logged-in user's email
- Role will display the correct translated role based on user type

## Files to Modify
- `frontend/src/pages/settings.page.tsx`

## Testing
1. Login as `association_admin` - verify email and "Administrador" role displayed
2. Login as `club_admin` (aikifire) - verify email and "Admin de Club" role displayed

## Implementation Status

### Completed Changes (2026-02-04)

**File Modified**: `frontend/src/pages/settings.page.tsx`

1. **Added import for auth context** (line 3):
   ```tsx
   import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
   ```

2. **Added role translations constant** (lines 10-13):
   ```tsx
   const roleTranslations: Record<string, string> = {
     'association_admin': 'Administrador',
     'club_admin': 'Admin de Club',
   };
   ```

3. **Added hook call in component** (line 19):
   ```tsx
   const { currentUser, userRole } = useAuthContext();
   ```

4. **Replaced hardcoded email** (line 43):
   ```tsx
   <p className="text-sm text-gray-900">{currentUser?.email ?? 'No disponible'}</p>
   ```

5. **Replaced hardcoded role** (line 47):
   ```tsx
   <p className="text-sm text-gray-900">{userRole ? (roleTranslations[userRole] || userRole) : 'No disponible'}</p>
   ```

6. **Removed unused import**: `Settings` from lucide-react (was not being used)

### Verification Needed
- [ ] Manual testing with `association_admin` login
- [ ] Manual testing with `club_admin` login
- [ ] QA validation via qa-criteria-validator agent
