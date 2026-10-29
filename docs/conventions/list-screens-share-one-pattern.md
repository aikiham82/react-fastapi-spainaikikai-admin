# 🎯 List screens share one pattern

## 💡 Convention

Every list screen (members, licences, insurance, invoices, clubs, seminars, prices) is built from the shared pieces in [`list-controls.tsx`](../../frontend/src/components/ui/list-controls.tsx):

- `ListToolbar`: search box, **one** "Filtros" button that opens a popover with labelled selects, and the primary action.
- `ChipGroup`: quick filters that matter most ("Todas", "Caducadas · 3", "Caducan pronto · 2").
- `EmptyState`: what happened plus "Quitar filtros" when a filter hides every row.
- `RowActions`: edit, delete and secondary actions in one row menu; destructive actions always confirm.
- `ListLoading` and `ListError`: the loading and error states.

A list the super admin can narrow by club puts [`ClubFilterSelect`](../../frontend/src/features/clubs/components/ClubFilterSelect.tsx) in that popover, shown only when `usePermissions().isAssociationAdmin()`, and sends its value as `club_id`. It loads the clubs itself, so the page needs no `ClubProvider` and a club admin never fetches the club list; the backend already forces a club admin to their own club.

Urgent rows come first. From 768px a table that fits at 1024px without clipped columns; below 768px tappable cards. Dialogs keep the save button visible in `DialogFooter`.

## 🏆 Benefits

- A user who learns one list knows them all: where to search, where the filters are, how to get back from an empty result.
- Unlabelled selects squeezed next to the search box were the main source of confusion in the UX audit.
- New lists cost less: the toolbar, empty state and row menu already exist.

## 👀 Examples

### ✅ Good: one toolbar, filters behind one button

```tsx
<ListToolbar
  search={{ value: search, onChange: setSearch, placeholder: 'Buscar miembro' }}
  filters={<StatusFilter />}
  activeFilters={activeCount}
  onClearFilters={clearFilters}
  action={<Button>Nuevo miembro</Button>}
/>
```

### ❌ Bad: a row of unlabelled selects

```tsx
<div className="flex gap-2">
  <Input placeholder="Buscar..." />
  <Select value="active" />   {/* "Activos" with no label */}
  <Select value="all" />      {/* "Todos": todos qué */}
</div>
```

## 🧐 Real world examples

- [`frontend/src/features/members/components/MemberList.tsx`](../../frontend/src/features/members/components/MemberList.tsx)
- [`frontend/src/features/licenses/components/LicenseList.tsx`](../../frontend/src/features/licenses/components/LicenseList.tsx): chips synced with `?estado=` in the URL.
- [`frontend/src/components/ui/list-controls.tsx`](../../frontend/src/components/ui/list-controls.tsx)
- [`frontend/src/features/insurance/components/InsuranceList.tsx`](../../frontend/src/features/insurance/components/InsuranceList.tsx): the Club filter next to type and status.

## 🔗 Related agreements

- [`ui-visual-language.md`](ui-visual-language.md)
- [`select-all-option.md`](select-all-option.md)
