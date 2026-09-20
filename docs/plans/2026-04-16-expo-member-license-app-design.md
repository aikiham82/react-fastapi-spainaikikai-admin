# Expo Member License App — Design Document

**Date:** 2026-04-16
**Status:** Approved
**Scope:** New Expo React Native mobile app for Spain Aikikai members (login + license view)

---

## 1. Overview

Simple mobile app for aikido federation members to view their digital license card. Two screens only: login and license display. Connects to existing FastAPI backend at `https://admin.spainaikikai.org`.

**Target users:** Individual members (role: `user` + `club_role: member`)
**Platforms:** iOS + Android via Expo

---

## 2. Architecture

### Project Location

`/mobile` directory within the monorepo (`react-fastapi-spainaikikai-admin/mobile/`).

### Folder Structure

```
mobile/
├── app/                        # Expo Router (file-based routing)
│   ├── _layout.tsx             # Root layout with providers (QueryClient, fonts)
│   ├── login.tsx               # Login screen
│   └── (app)/
│       ├── _layout.tsx         # Authenticated layout (redirects if no token)
│       └── index.tsx           # License screen (home)
├── src/
│   ├── core/
│   │   ├── api-client.ts       # Axios instance + JWT interceptor
│   │   └── storage.ts          # expo-secure-store wrapper
│   ├── features/
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts
│   │   │   └── hooks/
│   │   │       ├── useAuth.ts
│   │   │       └── mutations/useLoginMutation.ts
│   │   └── license/
│   │       ├── license.service.ts
│   │       ├── license.schema.ts
│   │       └── hooks/
│   │           └── queries/useLicenseQuery.ts
│   └── components/             # Shared UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── LoadingSpinner.tsx
│       └── EmptyState.tsx
├── assets/
│   └── logo.png                # Spain Aikikai logo
├── app.config.ts
├── package.json
├── tsconfig.json
└── babel.config.js
```

---

## 3. Design System

### Aesthetic Direction: Minimal Japanese + Institutional Credential

Clean, serious, respectful of tradition. Inspired by official Japanese documents.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#1A1A2E` | Main text, dark backgrounds |
| `accent` | `#C41E3A` | Traditional Japanese vermillion. Accents, active states, CTA buttons |
| `surface` | `#F5F0EB` | Warm washi-paper background |
| `surface-card` | `#FFFFFF` | License card container |
| `text-muted` | `#6B7280` | Secondary text |
| `success` | `#166534` | "Licencia Vigente" badge |
| `expired` | `#991B1B` | "Licencia Expirada" badge |

### Typography

- **Heading:** Barlow Condensed 600 (sports/athletic, condensed, impactful)
- **Body:** Barlow 400 (clean, legible)
- **Google Fonts:** `@expo-google-fonts/barlow`

### UX Guidelines Applied

- Touch targets: minimum 44x44px
- Touch spacing: minimum 8px gap between targets
- Loading buttons: disabled + spinner during async
- Haptic feedback on login success
- Animations: 150-300ms transitions
- prefers-reduced-motion respected

---

## 4. Screens

### 4.1 Login Screen

**Route:** `/login`

```
┌─────────────────────────┐
│                         │
│     ○ Logo Aikikai      │
│   Spain Aikikai         │
│                         │
│  ┌───────────────────┐  │
│  │ Email             │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ Contraseña    👁   │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │    ACCEDER        │  │  ← Vermillion red button
│  └───────────────────┘  │
│                         │
│   ¿Olvidaste tu         │
│    contraseña?          │
│                         │
└─────────────────────────┘
Background: #F5F0EB (surface)
```

**Behavior:**
- Email + password fields with validation
- Password visibility toggle
- Button disabled + spinner while loading
- Error: shake animation + inline red message
- Success: haptic feedback → navigate to license

### 4.2 License Screen

**Route:** `/(app)/` (authenticated home)

```
┌─────────────────────────┐
│ Mi Licencia       [⋯]  │  ← Header with logout menu
│                         │
│  ┌─────────────────────┐│
│  │                     ││
│  │  [License PNG       ││
│  │   image from        ││
│  │   backend - takes   ││
│  │   ~60% of screen]   ││
│  │                     ││
│  └─────────────────────┘│
│                         │
│  ● VIGENTE              │  ← Green badge if active
│  Expira: 31/08/2027    │
│                         │
│  Nombre: Juan García    │
│  Club: Aikido Madrid    │
│  Grado: 2º Dan         │
│                         │
│  ┌───────────────────┐  │
│  │  ⬇ DESCARGAR      │  │  ← Save to gallery / share
│  └───────────────────┘  │
│                         │
└─────────────────────────┘
```

**Behavior:**
- Pinch-to-zoom on license image
- Pull-to-refresh to re-fetch
- Skeleton placeholder while loading
- Download via expo-file-system + expo-sharing
- Logout in header menu (three dots)

---

## 5. API Integration

### Endpoints Used

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/auth/login` | POST | No | Login (form-encoded: username, password) |
| `/api/v1/users/me` | GET | Bearer | Get current user with member_id |
| `/api/v1/licenses/member/{member_id}` | GET | Bearer | Get member's licenses |
| `/api/v1/licenses/{license_id}/image` | GET | Bearer | Get license PNG (streaming) |

### Auth Flow

```
POST /api/v1/auth/login (form-encoded)
  → { access_token, token_type }
  → Store token in expo-secure-store
  → GET /api/v1/users/me (Bearer token)
  → { id, email, global_role, club_role, club_id, member_id }
  → Store user in React Query cache
  → Navigate to license screen
```

### License Fetch Flow

```
License screen mounts
  → useQuery: GET /api/v1/licenses/member/{member_id}
  → LicenseResponse[] → filter first with status "active" (or most recent)
  → Display metadata (grade, expiry, name)
  → useQuery: GET /api/v1/licenses/{license_id}/image (responseType: arraybuffer)
  → Convert to base64 data URI for Image component
  → Enable pinch-to-zoom + download
```

### Zod Schemas

```typescript
// Auth
const AuthResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
});

const UserMeSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  global_role: z.string(),
  club_role: z.string().nullable().optional(),
  club_id: z.string().nullable().optional(),
  member_id: z.string().nullable().optional(),
});

// License
const LicenseResponseSchema = z.object({
  id: z.string(),
  license_number: z.string().optional(),
  member_id: z.string(),
  member_name: z.string().nullable().optional(),
  dan_grade: z.number(),
  technical_grade: z.string(),
  instructor_category: z.string(),
  status: z.string(),
  issue_date: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  club_id: z.string().nullable().optional(),
});
```

---

## 6. Error Handling

| Screen | Error | UX Response |
|--------|-------|-------------|
| Login | Invalid credentials (401) | Shake input + inline red "Email o contraseña incorrectos" |
| Login | No connection | Banner: "Sin conexión a internet" |
| Login | Server error (500) | Toast: "Error del servidor, inténtalo más tarde" |
| License | No member_id on user | Empty state: "Tu cuenta no tiene un miembro asociado. Contacta con tu club." |
| License | No active license | Empty state: "No tienes licencia vigente. Contacta con tu club." |
| License | Image load error | Show license data without image + "Reintentar" button |
| Any | Token expired (401) | Auto-redirect to login, toast "Sesión expirada" |

### Loading States

- Login button: disabled + inline spinner (prevent double submit)
- License screen: skeleton card placeholder while image loads
- Pull-to-refresh on license screen

---

## 7. Dependencies

```
# Core
expo ~52
expo-router ~4
react-native 0.76+
typescript ~5.8

# Data
axios ^1.7
@tanstack/react-query ^5
zod ^3.23

# Security
expo-secure-store ~14

# Image & Download
expo-image ~2
expo-file-system ~18
expo-sharing ~13

# UX
react-native-gesture-handler ~2.20   # pinch-to-zoom
react-native-reanimated ~3.16        # animations
expo-haptics ~14                      # tactile feedback

# Fonts
expo-font
@expo-google-fonts/barlow
```

---

## 8. Implementation Plan

### Phase 1: Scaffold + Core (~10 files)
1. `npx create-expo-app mobile --template blank-typescript`
2. Install dependencies
3. Configure Expo Router, app.config.ts, tsconfig
4. Implement `src/core/api-client.ts` (axios + JWT interceptor)
5. Implement `src/core/storage.ts` (expo-secure-store wrapper)
6. Root layout with QueryClientProvider + font loading

### Phase 2: Auth Feature
7. `src/features/auth/auth.schema.ts` (Zod schemas)
8. `src/features/auth/auth.service.ts` (login, getMe)
9. `src/features/auth/hooks/useAuth.ts` (auth state, token management)
10. `src/features/auth/hooks/mutations/useLoginMutation.ts`
11. `app/login.tsx` (login screen UI)
12. `app/(app)/_layout.tsx` (auth guard redirect)

### Phase 3: License Feature
13. `src/features/license/license.schema.ts`
14. `src/features/license/license.service.ts` (getLicenses, getLicenseImage)
15. `src/features/license/hooks/queries/useLicenseQuery.ts`
16. `app/(app)/index.tsx` (license screen UI)
17. Download functionality (expo-file-system + expo-sharing)

### Phase 4: Polish
18. Shared components (Button, Input, LoadingSpinner, EmptyState)
19. Error handling (401 interceptor, offline detection)
20. Pinch-to-zoom on license image
21. Pull-to-refresh
22. Haptic feedback
23. Test on iOS + Android simulators
