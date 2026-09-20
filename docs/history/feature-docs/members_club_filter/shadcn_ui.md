# Club Filter Implementation - shadcn/ui Architecture Plan

## Overview
This document provides specific shadcn/ui component recommendations for implementing a club filter combobox in the members list, designed for super_admin role only.

## Key Design Decisions

### 1. Reuse `SearchableSelect` Component ✅
**Recommendation**: YES, reuse the existing `SearchableSelect` component with minimal modifications.

**Rationale**:
- The component already implements the correct shadcn pattern (Popover + Command)
- Follows the same architecture as the official combobox demo
- Already handles search, sorting, and accessibility
- Used successfully in `MemberForm.tsx` for club selection

**Required Modification**:
The component needs **one small enhancement** to support clearable behavior:

```typescript
// In SearchableSelectProps interface, add:
allowClear?: boolean;  // Enables clearing the selection

// In the onSelect handler within CommandItem:
onSelect={() => {
  // Current behavior: always set the value
  onValueChange(option.value);

  // Enhanced behavior with allowClear:
  if (allowClear && value === option.value) {
    onValueChange('');  // Clear if selecting the same value
  } else {
    onValueChange(option.value);
  }
  setOpen(false);
}}
```

**How to use for the club filter**:
```typescript
// In MemberList.tsx
const [clubFilter, setClubFilter] = useState<string>('');
const { clubs } = useClubContext();

// Prepare options with "All clubs" option
const clubOptions = [
  { value: '', label: 'Todos los clubs' },  // Empty string = no filter
  ...clubs.map(club => ({ value: club.id, label: club.name }))
];

<SearchableSelect
  options={clubOptions}
  value={clubFilter}
  onValueChange={(value) => {
    setClubFilter(value);
    setFilters({ ...filters, club_id: value || undefined, offset: 0 });
  }}
  placeholder="Filtrar por club"
  searchPlaceholder="Buscar club..."
  allowClear={true}  // NEW prop
  className="w-full sm:w-[240px]"
/>
```

**Why this approach**:
- No need for a separate "clear" button - selecting "Todos los clubs" naturally clears the filter
- Consistent with existing Select filters (member status, license status) that use "Todos" option
- Clean UX: the combobox shows "Todos los clubs" when no filter is active
- Less UI clutter than an additional × button

---

### 2. Active Filter Chip/Badge Pattern

**Recommendation**: Use shadcn `Badge` component with `variant="secondary"` plus an X button, displayed **below** the filter row.

**Component**: `/frontend/src/components/ui/badge.tsx` (already exists in project)

**Pattern**:
```typescript
// Only show when a club is actively selected
{clubFilter && (
  <div className="flex items-center gap-2">
    <Badge variant="secondary" className="flex items-center gap-1">
      <span>Club: {clubs.find(c => c.id === clubFilter)?.name}</span>
      <button
        type="button"
        onClick={() => {
          setClubFilter('');
          setFilters({ ...filters, club_id: undefined, offset: 0 });
        }}
        className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
        aria-label="Limpiar filtro de club"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  </div>
)}
```

**Visual hierarchy**:
```
[Search input] [Member Status Select] [License Status Select] [Club Combobox] [+ Nuevo Miembro]
↓
[Badge: Club: Aikido Madrid ×]  ← Only visible when filter is active
↓
[Table or cards with filtered results]
```

**Why Badge with X instead of alternatives**:
1. **Visual clarity**: Badges are semantically correct for showing active filters
2. **User control**: X button provides explicit clear action (in addition to selecting "Todos los clubs")
3. **Consistent with UX patterns**: Gmail, GitHub, Jira all use dismissible chips for active filters
4. **Mobile-friendly**: Badge + X is easier to tap than relying only on the combobox

**Badge variant choice**:
- `variant="secondary"` - Subtle, doesn't compete with primary actions
- Alternatives considered:
  - `variant="outline"` - Too subtle, could be missed
  - `variant="default"` - Too prominent for a filter indicator
  - Custom inline element - Reinventing the wheel, Badge already provides the styling

---

### 3. Filter Row Layout - Responsive Design

**Current layout** (from MemberList.tsx line 109):
```typescript
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
```

**Recommended enhanced layout**:
```typescript
<div className="space-y-4">
  {/* Filter controls row */}
  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
    {/* Search input - flex-1 takes remaining space */}
    <div className="flex-1 w-full relative">
      {/* ... existing search input ... */}
    </div>

    {/* Member status filter */}
    <Select value={memberStatusFilter} onValueChange={setMemberStatusFilter}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="Estado del miembro" />
      </SelectTrigger>
      {/* ... */}
    </Select>

    {/* License status filter */}
    <Select value={licenseStatusFilter} onValueChange={handleFilterStatus}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="Estado de licencia" />
      </SelectTrigger>
      {/* ... */}
    </Select>

    {/* Club filter - conditional for super_admin */}
    {canAccess({ resource: 'clubs', action: 'read' }) && (
      <SearchableSelect
        options={clubOptions}
        value={clubFilter}
        onValueChange={handleClubFilterChange}
        placeholder="Filtrar por club"
        searchPlaceholder="Buscar club..."
        allowClear={true}
        className="w-full sm:w-[240px]"
      />
    )}

    {/* Action buttons */}
    <div className="flex gap-2">
      {canAccess({ resource: 'members', action: 'create' }) && (
        <Button onClick={() => { setSelectedMemberForEdit(null); setIsFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Miembro
        </Button>
      )}
    </div>
  </div>

  {/* Active filter badges row */}
  {clubFilter && (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="flex items-center gap-1">
        <span>Club: {clubs.find(c => c.id === clubFilter)?.name}</span>
        <button
          type="button"
          onClick={handleClearClubFilter}
          className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
          aria-label="Limpiar filtro de club"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    </div>
  )}
</div>
```

**Responsive behavior**:
- **Mobile** (`< sm`): All filters stack vertically, full width
- **Desktop** (`≥ sm`): Horizontal row, search takes `flex-1` (remaining space), filters have fixed widths
- **Filter chips**: Always below the controls, wrap on narrow screens

**Width considerations**:
- Search: `flex-1` (fluid)
- Member Status Select: `w-full sm:w-[200px]`
- License Status Select: `w-full sm:w-[200px]`
- Club Combobox: `w-full sm:w-[240px]` (slightly wider due to longer club names)
- Button: Natural width based on content

---

### 4. Clearable Combobox Pattern - Best Practice

**Recommended approach**: Hybrid - "All clubs" option + explicit Badge X button

**Why not rely solely on "Todos los clubs" option**:
1. **User must re-open combobox** to clear the filter (extra click)
2. **Not immediately obvious** that "Todos los clubs" clears the filter
3. **Violates user expectation** - when a filter shows a specific selection, users expect a quick clear action

**Why not rely solely on Badge X button**:
1. **Badge only appears when filter is active** - no way to proactively select "all"
2. **Inconsistent** with other Select filters that have "Todos" option

**Best of both worlds**:
- **"Todos los clubs" option**: Natural way to select "no filter" from within the combobox
- **Badge X button**: Fast, explicit way to clear an active filter without re-opening the combobox
- Both actions result in the same state: `clubFilter = ''`

**Implementation**:
```typescript
// Option 1: Select "Todos los clubs" from combobox
const clubOptions = [
  { value: '', label: 'Todos los clubs' },  // Selecting this sets clubFilter = ''
  ...clubs.map(c => ({ value: c.id, label: c.name }))
];

// Option 2: Click X on the active filter badge
const handleClearClubFilter = () => {
  setClubFilter('');
  setFilters({ ...filters, club_id: undefined, offset: 0 });
};
```

**User flow**:
```
1. User opens combobox → sees "Todos los clubs" + club list
2. User selects "Aikido Madrid" → combobox shows "Aikido Madrid", Badge appears below
3. User wants to clear:
   Option A: Opens combobox, selects "Todos los clubs"
   Option B: Clicks X on Badge
4. Result: combobox shows "Todos los clubs", Badge disappears, table shows all members
```

---

## Component Integration Map

### Files to Modify

#### 1. `frontend/src/components/ui/searchable-select.tsx`
**Change**: Add `allowClear` prop (optional, defaults to `false` for backward compatibility)

```typescript
interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;  // NEW
}
```

**Impact**: Enables toggle behavior (click same item to deselect) when `allowClear={true}`

---

#### 2. `frontend/src/features/members/components/MemberList.tsx`
**Changes**:
1. Import `SearchableSelect`, `Badge`, `X` icon, `useClubContext`
2. Add `clubFilter` state
3. Fetch club options from `ClubContext`
4. Add club combobox to filter row (conditional on `canAccess`)
5. Add active filter badge row
6. Update empty state message when club filter is active

**Permission check**:
```typescript
// Show club filter only for super_admin
{canAccess({ resource: 'clubs', action: 'read' }) && (
  <SearchableSelect ... />
)}
```

**Empty state enhancement**:
```typescript
if (members.length === 0 && clubFilter) {
  return (
    <div className="text-center py-12">
      <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
      <p className="text-gray-600 mb-4">
        No se encontraron miembros en este club
      </p>
      <Button
        variant="outline"
        onClick={handleClearClubFilter}
      >
        Limpiar filtro de club
      </Button>
    </div>
  );
}
```

---

#### 3. `frontend/src/features/members/hooks/useMemberContext.tsx`
**Change**: No changes needed! The context already supports `club_id` filter.

**Existing implementation**:
```typescript
interface MemberFilters {
  search?: string;
  status?: 'active' | 'inactive';
  license_status?: 'active' | 'expired' | 'pending';
  club_id?: string;  // Already exists!
}
```

The `setFilters` function already passes `club_id` to the backend via `fetchMembers` service.

---

## Accessibility Considerations

### ARIA Labels
```typescript
<SearchableSelect
  placeholder="Filtrar por club"
  searchPlaceholder="Buscar club..."
  emptyMessage="No se encontraron clubs"
  aria-label="Filtrar miembros por club"
/>

<button
  type="button"
  onClick={handleClearClubFilter}
  aria-label="Limpiar filtro de club"
>
  <X className="h-3 w-3" />
</button>
```

### Keyboard Navigation
- SearchableSelect already handles this via Command component
- Badge X button is keyboard accessible (button element)
- Focus order: Search → Member Status → License Status → Club Filter → Badge X → Action Buttons

### Screen Reader Announcements
Consider adding a live region to announce filter changes:
```typescript
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {clubFilter && `Filtrando por club: ${clubs.find(c => c.id === clubFilter)?.name}`}
</div>
```

---

## Visual Design Consistency

### Color Palette
- **Badge secondary**: Uses `bg-secondary` and `text-secondary-foreground` from theme
- **No custom colors needed** - all styling comes from existing design tokens in `frontend/src/index.css`

### Spacing
- Filter row gap: `gap-4` (1rem) - consistent with existing layout
- Badge gap: `gap-2` (0.5rem) - tighter for inline elements
- Badge internal gap: `gap-1` (0.25rem) - between text and X button

### Typography
- Badge text: `text-xs` - consistent with existing Badge component
- SearchableSelect: Inherits Button typography (`font-normal`)

---

## Testing Considerations

### Unit Tests (recommended for `searchable-select.tsx`)
```typescript
describe('SearchableSelect with allowClear', () => {
  it('should clear selection when clicking selected item with allowClear=true', () => {
    // Test that selecting the same item calls onValueChange('')
  });

  it('should not clear selection when allowClear=false', () => {
    // Test that selecting the same item keeps the selection
  });
});
```

### Integration Tests (recommended for `MemberList.tsx`)
```typescript
describe('Club filter', () => {
  it('should show club filter only for super_admin', () => {
    // Mock canAccess to return true
    // Assert club combobox is visible
  });

  it('should hide club filter for club_admin', () => {
    // Mock canAccess to return false
    // Assert club combobox is not in document
  });

  it('should show active filter badge when club is selected', () => {
    // Select a club
    // Assert Badge appears with club name
  });

  it('should clear filter when clicking badge X button', () => {
    // Select a club
    // Click X button on badge
    // Assert filter is cleared, badge disappears
  });

  it('should show empty state message for club filter', () => {
    // Select a club that has no members
    // Assert custom empty state message appears
  });
});
```

---

## Migration from Existing Patterns

### Comparison with Other Filters

| Filter | Component | Pattern | Clear Method |
|--------|-----------|---------|--------------|
| Member Status | `Select` | "Todos" option | Select "Todos" |
| License Status | `Select` | "Todos" option | Select "Todos" |
| **Club** (NEW) | `SearchableSelect` | "Todos los clubs" option + Badge X | Select "Todos" OR click X |
| Search | `Input` | Native input | Clear input text |

**Why club filter differs**:
- SearchableSelect supports search (unlike regular Select)
- Club names are longer → benefits from search functionality
- Super_admin context → more clubs to filter through
- Badge X provides power-user shortcut (consistent with Gmail, GitHub filters)

---

## Performance Considerations

### ClubContext Data Fetching
```typescript
// In MemberList.tsx
const { clubs } = useClubContext();

// ClubContext should fetch clubs once on mount
// SearchableSelect automatically sorts options
// No additional memoization needed for clubOptions
```

**Why no memoization needed**:
- SearchableSelect already uses `useMemo` internally for sorting
- Club list changes infrequently (not on every render)
- Options array is small (typically < 50 clubs)

### Filter Application
```typescript
// Filter is applied via setFilters, which triggers React Query refetch
// No additional debouncing needed (unlike search input)
useEffect(() => {
  setFilters({ ...filters, club_id: clubFilter || undefined, offset: 0 });
}, [clubFilter]);
```

---

## Alternative Approaches Considered (and Why They Were Rejected)

### 1. Custom Combobox Component (❌)
**Why rejected**: Reinventing the wheel. SearchableSelect already implements the exact pattern we need.

### 2. Regular Select Instead of SearchableSelect (❌)
**Why rejected**:
- Doesn't support search
- Poor UX when club list grows (>10 clubs)
- Inconsistent with MemberForm club selector

### 3. Multi-Select for Multiple Clubs (❌)
**Why rejected**:
- Over-engineering for current requirements
- Adds complexity to filter logic
- Not requested by user

### 4. Inline X Button in Combobox Trigger (❌)
**Why rejected**:
- Clutters the combobox UI
- Confusing interaction (clicking X vs clicking dropdown arrow)
- Not consistent with shadcn patterns

### 5. Toggle Buttons for Common Clubs (❌)
**Why rejected**:
- Assumes we know which clubs are "common"
- Takes up more horizontal space
- Poor scalability

---

## Implementation Checklist

- [ ] Modify `SearchableSelect.tsx` to add `allowClear` prop
- [ ] Add club filter state to `MemberList.tsx`
- [ ] Import and integrate `SearchableSelect` for club filter
- [ ] Add permission check for `canAccess({ resource: 'clubs', action: 'read' })`
- [ ] Implement active filter badge with X button
- [ ] Update empty state to handle club filter
- [ ] Add ARIA labels for accessibility
- [ ] Test responsive behavior (mobile + desktop)
- [ ] Verify integration with existing member status and license status filters
- [ ] Test keyboard navigation
- [ ] Verify that club_admin does NOT see the club filter

---

## Future Enhancements (Out of Scope)

1. **Persist filter state in URL query params** - For shareable links
2. **Multi-club filter** - If super_admin needs to compare multiple clubs
3. **Recent clubs shortcut** - Quick access to frequently filtered clubs
4. **Filter presets** - Save common filter combinations

---

## Summary of Answers

### Q1: Can I reuse SearchableSelect as-is?
**Answer**: Almost. Add one small enhancement: `allowClear` prop to support toggling the selection. This is a generic enhancement that benefits all future uses of SearchableSelect.

### Q2: Badge or custom inline element for filter chip?
**Answer**: Use shadcn Badge component with `variant="secondary"`. It's semantically correct, already styled consistently, and provides the exact functionality needed.

### Q3: How should the filter row layout work responsively?
**Answer**: Current `flex flex-col sm:flex-row` pattern works well. Stack filters vertically on mobile, horizontal on desktop. Place active filter badges in a separate row below the controls to avoid cramping the filter row.

### Q4: Best pattern for clearable combobox?
**Answer**: Hybrid approach - include "Todos los clubs" as the first option in the combobox AND provide a Badge X button. This gives users two intuitive ways to clear the filter, matching patterns from Gmail, GitHub, and other modern web apps.

---

## Key Takeaways

1. **Reuse existing components** - SearchableSelect already implements the shadcn combobox pattern correctly
2. **Follow existing patterns** - Badge for active filters is consistent with modern UX
3. **Progressive disclosure** - Hide club filter from club_admin (they only see their own club)
4. **Dual clear methods** - "All clubs" option + Badge X button provides flexibility
5. **No over-engineering** - Don't add multi-select, presets, or URL persistence until needed
6. **Accessibility first** - ARIA labels, keyboard navigation, screen reader support
7. **Consistent spacing** - Use existing Tailwind classes, maintain visual hierarchy

---

## Component Dependency Graph

```
MemberList.tsx
├── SearchableSelect (enhanced with allowClear)
│   ├── Popover
│   ├── PopoverTrigger
│   ├── PopoverContent
│   ├── Command
│   ├── CommandInput
│   ├── CommandList
│   ├── CommandEmpty
│   ├── CommandGroup
│   └── CommandItem
├── Badge (for active filter)
├── Button (for clear action in empty state)
├── useClubContext (for clubs data)
├── useMemberContext (existing, no changes)
└── usePermissions (for conditional rendering)
```

---

## Files Summary

### Modified Files
1. `frontend/src/components/ui/searchable-select.tsx` - Add `allowClear` prop
2. `frontend/src/features/members/components/MemberList.tsx` - Add club filter UI

### Unchanged Files (already support the feature)
1. `frontend/src/features/members/hooks/useMemberContext.tsx` - Already has `club_id` filter
2. `frontend/src/features/members/data/services/memberService.ts` - Already sends `club_id` to backend
3. Backend files - Already enriching members with `club_name`

### Existing Components Used (no modification needed)
1. `frontend/src/components/ui/badge.tsx` - Use as-is
2. `frontend/src/components/ui/popover.tsx` - Already used by SearchableSelect
3. `frontend/src/components/ui/command.tsx` - Already used by SearchableSelect
4. `frontend/src/components/ui/button.tsx` - Already used throughout
