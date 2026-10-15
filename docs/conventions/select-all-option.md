# 🎯 A select's "all" option is the value "all", never an empty string

## 💡 Convention

In a shadcn/Radix `Select`, the option that clears a filter ("Todos") uses `value="all"` and the change handler maps `"all"` back to "no filter". Never give a `SelectItem` an empty value.

## 🏆 Benefits

- Radix throws at render on `<SelectItem value="">`, which blanks the whole page, not just the select. The Facturas page shipped like that and only crashed once production had its first invoice.
- Every screen reads the same way, so the next filter is copied right.

## 👀 Examples

### ✅ Good

```tsx
const ALL_STATUSES = 'all';
const statusFilter = filters.status ?? ALL_STATUSES;

<Select
  value={statusFilter}
  onValueChange={(value) =>
    setFilters({ ...filters, status: value === ALL_STATUSES ? undefined : (value as InvoiceStatus) })
  }
>
  <SelectItem value={ALL_STATUSES}>Todos</SelectItem>
</Select>
```

### ❌ Bad

```tsx
<SelectItem value="">Todos</SelectItem>
```

## 🧐 Real world examples

- [`frontend/src/features/invoices/components/InvoiceList.tsx`](../../frontend/src/features/invoices/components/InvoiceList.tsx)
- [`frontend/src/features/members/components/MemberList.tsx`](../../frontend/src/features/members/components/MemberList.tsx)
- [`frontend/src/features/import-export/components/ImportExportPage.tsx`](../../frontend/src/features/import-export/components/ImportExportPage.tsx)

## 🔗 Related agreements

- [`frontend.md`](frontend.md)
