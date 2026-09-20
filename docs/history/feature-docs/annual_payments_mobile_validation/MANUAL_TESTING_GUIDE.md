# Manual Testing Guide
## Annual Payments Mobile Responsiveness

**Time Required:** 15-20 minutes
**Prerequisites:** Access to http://localhost:5173 with valid login credentials

---

## Quick Start

1. Open Chrome browser
2. Press `F12` to open DevTools
3. Press `Ctrl+Shift+M` (or `Cmd+Shift+M` on Mac) to toggle Device Toolbar
4. Follow the testing steps below

---

## Testing Steps

### Setup

1. **Log in to the application**
   - Navigate to http://localhost:5173/login
   - Enter your credentials (e.g., admin@spainaikikai.es / admin123)
   - Click "Iniciar Sesión"

2. **Navigate to Annual Payments**
   - Go to http://localhost:5173/annual-payments
   - Or click "Pagos Anuales" in the sidebar

3. **Select a Club** (if prompted)
   - Choose any club from the dropdown to see the full form

---

### Mobile Testing (393px)

**Set viewport:** Select "iPhone 14 Pro" from the device dropdown, or set custom 393×851

#### ✅ Test 1: Stacked Layout
- [ ] Each QuantityInput item shows **2 rows**:
  - **Top row:** Label (e.g., "KYU adulto") + unit price
  - **Bottom row:** Minus button, count, plus button, total price
- [ ] Items are vertically stacked, not cramped horizontally

**Expected:**
```
┌─────────────────────────────────┐
│ KYU adulto                      │
│ 15.00€ / unidad                 │
├─────────────────────────────────┤
│ [-] [0] [+]          0.00€     │
└─────────────────────────────────┘
```

---

#### ✅ Test 2: Long Labels
- [ ] Find "FUKUSHIDOIN (incluye RC + DAN)" label
- [ ] Verify text displays fully (no cut-off or "...")
- [ ] Check if wrapping looks natural (not awkward)

**Expected:** Label wraps across full width, readable without truncation

---

#### ✅ Test 3: Touch Targets
- [ ] Tap the minus (-) button multiple times
- [ ] Tap the plus (+) button multiple times
- [ ] Buttons should be **easy to hit** with your finger/cursor
- [ ] No accidental misses or need for precision

**Expected:** Buttons feel responsive and easy to tap (32×32px size)

---

#### ✅ Test 4: Price Alignment
- [ ] Look at the total prices on the right side of each item
- [ ] Verify all prices are **right-aligned**
- [ ] Prices should be clearly visible (not hidden or overlapping)

**Expected:** Prices form a clean right-aligned column

---

#### ✅ Test 5: No Horizontal Scroll
- [ ] Scroll down through the entire form
- [ ] Try to scroll horizontally (swipe left/right)
- [ ] Verify **no horizontal scrollbar** appears

**Expected:** Content stays within viewport width, no horizontal scroll

---

#### ✅ Test 6: Seguros Section
- [ ] Scroll to the "Seguros" section
- [ ] Verify insurance items (SEGURO ACCIDENTES, SEGURO RC) use the **same stacked layout**
- [ ] Check they match the license items above

**Expected:** Consistent 2-row stacking across all QuantityInput items

---

### Desktop Testing (1440px)

**Set viewport:** Select "Laptop with HiDPI screen" or set custom 1440×900

#### ✅ Test 7: Single Row Layout
- [ ] Each QuantityInput item shows **1 row** with:
  - Left: Label and unit price
  - Center: Minus button, count, plus button
  - Right: Total price
- [ ] No vertical stacking (all on one line)

**Expected:**
```
┌──────────────────────────────────────────────────────────┐
│ KYU adulto                    [-] [0] [+]       0.00€    │
│ 15.00€ / unidad                                          │
└──────────────────────────────────────────────────────────┘
```

---

#### ✅ Test 8: Sidebar Visibility
- [ ] Look at the right side of the screen
- [ ] Verify **Payment Summary sidebar** is visible
- [ ] Sidebar should show total, breakdown, and "Proceder al Pago" button
- [ ] Sidebar should be fixed width (380px) and stay visible

**Expected:** Form on left (~60%), sidebar on right (~40%)

---

### Functional Testing (All Viewports)

#### ✅ Test 9: Increment/Decrement
- [ ] Click (+) on "KYU adulto" → count increases to 1
- [ ] Click (+) again → count increases to 2
- [ ] Click (-) → count decreases to 1
- [ ] Click (-) again → count decreases to 0
- [ ] Verify (-) button is **disabled at 0**
- [ ] Add 200 items → Verify (+) button is **disabled at max**

**Expected:** Buttons work smoothly, disabled states prevent invalid values

---

#### ✅ Test 10: Price Updates
- [ ] Set "KYU adulto" (15€) to 5 → Total shows **75.00€**
- [ ] Set "DAN" (20€) to 3 → Total shows **60.00€**
- [ ] Check sidebar → Overall total updates immediately
- [ ] Verify all decimals show as `.00€`

**Expected:** Prices calculate correctly in real-time

---

#### ✅ Test 11: Console Errors
- [ ] Keep DevTools open to "Console" tab
- [ ] Interact with the form (increment, decrement, scroll)
- [ ] Check for **red error messages**
- [ ] Yellow warnings are okay, red errors are not

**Expected:** No red errors in console (warnings acceptable)

---

## Screenshot Checklist

Capture these screenshots for documentation:

1. **Mobile (393px):**
   - [ ] Full form view showing stacked QuantityInput items
   - [ ] Close-up of "FUKUSHIDOIN (incluye RC + DAN)" label wrapping
   - [ ] Seguros section showing consistent stacking

2. **Desktop (1440px):**
   - [ ] Full page view with sidebar visible
   - [ ] Close-up of single-row QuantityInput layout
   - [ ] Payment summary sidebar detail

**Save to:** `.claude/doc/annual_payments_mobile_validation/screenshots/`

---

## Reporting Results

### If All Tests Pass ✅
- Feature is **ready for deployment**
- Update acceptance_criteria_checklist.md with visual confirmations
- Share screenshots with team

### If Any Test Fails ❌
- Note which specific criterion failed
- Capture screenshot of the issue
- Report to developer with:
  - Test number and description
  - Expected vs. actual behavior
  - Viewport size where issue occurred
  - Screenshot of the problem

---

## Common Issues and Solutions

### Issue: Can't log in
- **Solution:** Verify backend is running on port 8000
- **Check:** `curl http://localhost:8000/api/v1/health`

### Issue: Annual Payments page not found
- **Solution:** Verify you're using the correct branch
- **Check:** Git status for recent commits

### Issue: Sidebar not visible on desktop
- **Solution:** Ensure viewport is at least 1024px wide
- **Try:** Zoom out if at 1440px and still no sidebar

### Issue: Horizontal scroll on mobile
- **Solution:** This is a bug - report to developer
- **Capture:** Screenshot showing scrollbar

---

## Time Estimates

| Task | Time |
|------|------|
| Setup and login | 2 min |
| Mobile tests (6 criteria) | 6 min |
| Desktop tests (2 criteria) | 2 min |
| Functional tests (3 criteria) | 4 min |
| Screenshot capture | 3 min |
| Documentation | 3 min |
| **TOTAL** | **20 min** |

---

## Checklist Summary

- [ ] All 6 mobile criteria passed
- [ ] All 2 desktop criteria passed
- [ ] All 3 functional criteria passed
- [ ] No console errors found
- [ ] Screenshots captured
- [ ] Results documented

**Testing Completed By:** _______________
**Date:** _______________
**Overall Result:** ☐ PASS  ☐ FAIL

---

**Need Help?**
- Full validation report: `.claude/doc/annual_payments_mobile_validation/feedback_report.md`
- Acceptance criteria: `.claude/doc/annual_payments_mobile_validation/acceptance_criteria_checklist.md`
- Summary: `.claude/doc/annual_payments_mobile_validation/SUMMARY.md`
