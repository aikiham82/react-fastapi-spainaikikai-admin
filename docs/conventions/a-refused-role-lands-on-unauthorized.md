# 🎯 A member lands on their card, a refused role on /unauthorized

## 💡 Convention

In the admin web, a signed-in user with no panel role (`userRole === null`: a member who manages nothing) is sent by `AppLayout` to `/card` **before** any page or `ProtectedRoute` renders. What that user reads lives in [`card.page.tsx`](../../frontend/src/pages/card.page.tsx). `ProtectedRoute` only ever sees users who already have a role: it sends a manager refused one screen to `/unauthorized`, so copy for a member never goes in `ProtectedRoute` or in [`unauthorized.page.tsx`](../../frontend/src/pages/unauthorized.page.tsx).

## 🏆 Benefits

- 2026-10-27: the "your card is in the app" message was first added to `ProtectedRoute`; its unit test passed, but no user could reach it, and members kept reading the old "ask for access". UI QA caught it on the rendered screen.

## 👀 Examples

### ✅ Good: the layout decides where a member goes

```tsx
if (!userRole) {
  return <Navigate to="/card" replace />;
}
```

### ❌ Bad: a branch the layout never lets through

```tsx
// ProtectedRoute.tsx
if (!userRole) return <p>El panel es para los responsables…</p>
```

## 🧐 Real world examples

- [`AppLayout.tsx`](../../frontend/src/components/AppLayout.tsx)
- [`unauthorized.page.test.tsx`](../../frontend/src/pages/__tests__/unauthorized.page.test.tsx)

## 🔗 Related agreements

- [The card is for every member, the panel for managers](../domain/the-card-is-for-every-member-the-panel-for-managers.md)
- [Roles and permissions](../domain/roles-and-permissions.md)
