# 🎯 Navigation is groups and tabs, two levels at most

## 💡 Convention

The menu has two levels and no third. A **group** (Inicio, Club, Pagos, Seminarios, Admin, Ajustes) is an icon in the desktop rail and in the mobile bottom bar; the **screens** of the active group are underline tabs in the header. Both come from the single list in [`navigation.ts`](../../frontend/src/components/navigation.ts).

- Add a screen by adding a tab to its group in `GROUPS`, with its `resource` and, if needed, `roles`. Never hard-code a link in `Rail`, `Header`, `BottomNav` or `Sidebar`.
- A screen with sub-views addressed by `?tab=` (Pagos: Pendientes and Historial) declares each sub-view as its own tab with `tab: '...'`. The page reads the parameter and renders one view; it has no tab list of its own.
- Counters live on the group icon: the sum of `useNavCounters()` over the group's tab paths.
- The mobile bar holds `MOBILE_GROUP_IDS` plus "Más", which opens the full menu (`Sidebar`).

## 🏆 Benefits

- The director always sees where they are: the red icon says the group, the underline says the screen.
- Role filtering happens once, so a club admin never sees a tab their role cannot open.
- Mirrors the Sammy suite structure the user preferred ("está mejor estructurado y es más fácil").

## 👀 Examples

### ✅ Good: a new screen is one entry

```ts
{ title: 'Grados', path: '/grades', resource: 'grades' },
```

### ❌ Bad: a page with its own tabs under the header tabs

```tsx
<TabsList><TabsTrigger value="pendientes">Pendientes</TabsTrigger>…</TabsList>
```

Two rows of tabs is a third navigation level.

## 🧐 Real world examples

- [`frontend/src/components/navigation.ts`](../../frontend/src/components/navigation.ts)
- [`frontend/src/components/Rail.tsx`](../../frontend/src/components/Rail.tsx), [`Header.tsx`](../../frontend/src/components/Header.tsx), [`BottomNav.tsx`](../../frontend/src/components/BottomNav.tsx)
- [`frontend/src/pages/payments.page.tsx`](../../frontend/src/pages/payments.page.tsx)

## 🔗 Related agreements

- [`ui-visual-language.md`](ui-visual-language.md)
- [`../domain/roles-and-permissions.md`](../domain/roles-and-permissions.md)
