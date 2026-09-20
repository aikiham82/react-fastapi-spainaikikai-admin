# Visual Reference: Responsive Layout Behavior

**Component:** QuantityInput
**Breakpoint:** 640px (Tailwind `sm:`)

---

## Mobile Layout (<640px)

### iPhone 14 Pro (393px)

```
┌─────────────────────────────────────────────┐
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ KYU adulto                          │   │  ← Label row (full width)
│  │ 15.00€ / unidad                     │   │  ← Unit price
│  ├─────────────────────────────────────┤   │
│  │ [-] [0] [+]            0.00€        │   │  ← Controls row
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ KYU infantil (≤14 años)             │   │
│  │ 5.00€ / unidad                      │   │
│  ├─────────────────────────────────────┤   │
│  │ [-] [0] [+]            0.00€        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ DAN                                 │   │
│  │ 20.00€ / unidad                     │   │
│  ├─────────────────────────────────────┤   │
│  │ [-] [0] [+]            0.00€        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ FUKUSHIDOIN                         │   │  ← Long label
│  │ (incluye RC + DAN)                  │   │  ← Wraps naturally
│  │ 70.00€ / unidad                     │   │
│  ├─────────────────────────────────────┤   │
│  │ [-] [0] [+]            0.00€        │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### Key Characteristics
- **2-row layout:** Label on top, controls on bottom
- **Full-width labels:** ~393px available for text
- **Spaced buttons:** Easy to tap with finger
- **Right-aligned prices:** Forms clean column
- **Vertical stacking:** Items stacked with gap-2 (8px)

---

## Tablet/Desktop Layout (≥640px)

### Desktop (1440px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ KYU adulto                           [-] [0] [+]          0.00€        │ │
│  │ 15.00€ / unidad                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ KYU infantil (≤14 años)              [-] [0] [+]          0.00€        │ │
│  │ 5.00€ / unidad                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ DAN                                  [-] [0] [+]          0.00€        │ │
│  │ 20.00€ / unidad                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ FUKUSHIDOIN (incluye RC + DAN)       [-] [0] [+]         0.00€        │ │
│  │ 70.00€ / unidad                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Characteristics
- **Single-row layout:** Label and controls on same line
- **Left-aligned labels:** flex-1 expands to fill space
- **Right-aligned controls:** justify-end groups on right
- **Compact spacing:** py-3 (12px) instead of py-4 (16px)
- **Long labels fit:** Enough space for full text on one line

---

## Breakpoint Transition

### At exactly 640px (Tailwind sm:)

**Before (639px):**
```
┌──────────────────────┐
│ Label                │  ← flex-col
│ Controls             │
└──────────────────────┘
```

**After (640px):**
```
┌─────────────────────────────────┐
│ Label         Controls          │  ← flex-row
└─────────────────────────────────┘
```

---

## Full Page Layout

### Mobile (393px)

```
┌───────────────────────────────────┐
│  Header                           │
├───────────────────────────────────┤
│  Sidebar (collapsed/off-canvas)   │
├───────────────────────────────────┤
│                                   │
│  ┌─────────────────────────────┐ │
│  │ Payer Data Section          │ │
│  └─────────────────────────────┘ │
│                                   │
│  ┌─────────────────────────────┐ │
│  │ Club Fee Section            │ │
│  └─────────────────────────────┘ │
│                                   │
│  ┌─────────────────────────────┐ │
│  │ Member Fees Section         │ │
│  │  - KYU adulto (2 rows)      │ │
│  │  - KYU infantil (2 rows)    │ │
│  │  - DAN (2 rows)             │ │
│  │  - FUKUSHIDOIN (2 rows)     │ │
│  └─────────────────────────────┘ │
│                                   │
│  ┌─────────────────────────────┐ │
│  │ Insurance Section           │ │
│  │  - Accidentes (2 rows)      │ │
│  │  - RC (2 rows)              │ │
│  └─────────────────────────────┘ │
│                                   │
│  ┌─────────────────────────────┐ │
│  │ Payment Summary (stacked)   │ │
│  │  - Subtotal                 │ │
│  │  - Total                    │ │
│  │  - [Proceder al Pago]       │ │
│  └─────────────────────────────┘ │
│                                   │
└───────────────────────────────────┘
```

### Desktop (1440px)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Header                                                                │
├───┬────────────────────────────────────────────────────────────────────┤
│ S │                                                                    │
│ i │  ┌──────────────────────────────────┐  ┌────────────────────┐    │
│ d │  │ Payer Data Section               │  │ Payment Summary    │    │
│ e │  └──────────────────────────────────┘  │                    │    │
│ b │                                         │  Subtotal: 0.00€   │    │
│ a │  ┌──────────────────────────────────┐  │  Total: 0.00€      │    │
│ r │  │ Club Fee Section                 │  │                    │    │
│   │  └──────────────────────────────────┘  │  [Proceder Pago]   │    │
│   │                                         │                    │    │
│   │  ┌──────────────────────────────────┐  └────────────────────┘    │
│   │  │ Member Fees Section              │         ↑                   │
│   │  │  - KYU adulto (1 row)            │    Fixed 380px              │
│   │  │  - KYU infantil (1 row)          │    Sidebar                  │
│   │  │  - DAN (1 row)                   │                             │
│   │  │  - FUKUSHIDOIN (1 row)           │                             │
│   │  └──────────────────────────────────┘                             │
│   │                                                                    │
│   │  ┌──────────────────────────────────┐                             │
│   │  │ Insurance Section                │                             │
│   │  │  - Accidentes (1 row)            │                             │
│   │  │  - RC (1 row)                    │                             │
│   │  └──────────────────────────────────┘                             │
│   │                                                                    │
└───┴────────────────────────────────────────────────────────────────────┘
```

---

## Component Anatomy

### Mobile QuantityInput (Stacked)

```
┌──────────────────────────────────────┐  ← Container: flex flex-col
│  ┌────────────────────────────────┐  │
│  │ Label (flex-1)                 │  │  ← First child: full width
│  │ Unit price text                │  │
│  └────────────────────────────────┘  │
│  ↓ gap-2 (8px spacing)               │
│  ┌────────────────────────────────┐  │
│  │  ┌──────────────────────────┐  │  │
│  │  │ Button Group             │  │  │  ← Second child: controls
│  │  │  [-] [0] [+]             │  │  │
│  │  └──────────────────────────┘  │  │
│  │         justify-between         │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │ Price (w-20 text-right)  │  │  │
│  │  │ 75.00€                   │  │  │
│  │  └──────────────────────────┘  │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
    py-4 (16px top/bottom padding)
```

### Desktop QuantityInput (Horizontal)

```
┌────────────────────────────────────────────────────────────┐  ← Container: flex flex-row
│                                                            │
│  ┌─────────────────┐     ┌──────────────┐  ┌──────────┐  │
│  │ Label (flex-1)  │     │ Button Group │  │ Price    │  │
│  │ Unit price      │     │  [-] [0] [+] │  │ 75.00€   │  │
│  └─────────────────┘     └──────────────┘  └──────────┘  │
│   ↑                       ↑                  ↑            │
│   Left (flex-1)           Right              Right        │
│                           (justify-end)                    │
└────────────────────────────────────────────────────────────┘
  py-3 (12px top/bottom padding)
```

---

## Button Group Detail

```
┌─────────────────────────────────────┐
│  ┌────┐     ┌────┐     ┌────┐      │
│  │ -  │  8px│  0 │  8px│ +  │      │  ← gap-2 spacing
│  └────┘     └────┘     └────┘      │
│   32px       32px       32px        │  ← h-8 w-8 sizing
│                                     │
│  Touch targets: ~48px with padding  │  ← Natural button padding
└─────────────────────────────────────┘
```

---

## Price Alignment Example

### Multiple Items (Mobile)

```
┌────────────────────────────────┐
│ [-] [0] [+]          0.00€     │
│ [-] [2] [+]         30.00€     │  ← Right-aligned
│ [-] [5] [+]        100.00€     │  ← Forms clean column
│ [-] [1] [+]         70.00€     │
└────────────────────────────────┘
      ↑                    ↑
  Left (buttons)      Right (w-20 text-right)
```

---

## Spacing System

### Mobile Vertical Spacing

```
[Item 1]       ← border-b
↓ py-4 (16px)
─────────────  ← border
↓ py-4 (16px)
[Item 2]       ← border-b
↓ py-4 (16px)
─────────────  ← border
↓ py-4 (16px)
[Item 3]
```

### Desktop Vertical Spacing (Compact)

```
[Item 1]       ← border-b
↓ py-3 (12px)
─────────────  ← border
↓ py-3 (12px)
[Item 2]       ← border-b
↓ py-3 (12px)
─────────────  ← border
↓ py-3 (12px)
[Item 3]
```

---

## Accessibility Features

### ARIA Live Region

```
When user clicks [+]:
┌────────────┐
│  [0] → [1] │  Screen reader announces: "1"
└────────────┘
     ↑
  aria-live="polite"
  aria-atomic="true"
```

### ARIA Labels

```
┌────────────────────────────────┐
│  KYU adulto                    │  ← Context label
│  [-] [0] [+]                   │
│   ↑       ↑                    │
│   aria-label="Disminuir KYU adulto"
│           aria-label="Aumentar KYU adulto"
└────────────────────────────────┘
```

---

## State Visualization

### Disabled States

```
Value = 0:
┌────────────────────────────────┐
│  [X] [0] [+]          0.00€    │  ← Minus disabled (grayed)
│   ↑
│  disabled (value === 0)
└────────────────────────────────┘

Value = 200 (max):
┌────────────────────────────────┐
│  [-] [200] [X]      3000.00€   │  ← Plus disabled (grayed)
│             ↑
│  disabled (isAtMax)
└────────────────────────────────┘
```

---

## Responsive Class Application

### Base (Mobile) Classes
```css
.flex            /* All viewports */
.flex-col        /* <640px */
.items-center    /* All viewports */
.justify-between /* <640px */
.py-4            /* <640px */
.gap-2           /* <640px */
```

### Desktop Override Classes (≥640px)
```css
.sm\:flex-row        /* ≥640px: row layout */
.sm\:items-center    /* ≥640px: vertical center */
.sm\:justify-between /* ≥640px: spread items */
.sm\:py-3            /* ≥640px: compact padding */
.sm\:gap-0           /* ≥640px: remove gap */
.sm\:justify-end     /* ≥640px: align right */
```

---

## Testing Viewports

| Device | Width | Layout | Notes |
|--------|-------|--------|-------|
| iPhone SE | 375px | Mobile | Smallest common phone |
| iPhone 14 Pro | 393px | Mobile | Target test viewport |
| iPhone 14 Pro Max | 430px | Mobile | Largest iPhone |
| iPad Mini | 768px | Desktop | Tablet breakpoint |
| MacBook Air | 1280px | Desktop | Common laptop |
| Desktop | 1440px | Desktop | Target test viewport |

---

**Reference:** This document visualizes the implementation in `QuantityInput.tsx`
**Updated:** 2026-02-10
