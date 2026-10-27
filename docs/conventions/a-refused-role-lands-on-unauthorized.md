# 🎯 A refused role lands on /unauthorized

## 💡 Convention

In the admin web, a signed-in user with no panel role (`userRole === null`: a member who manages nothing) is sent by `AppLayout` to `/unauthorized` **before** any page or `ProtectedRoute` renders. What that user reads lives in [`unauthorized.page.tsx`](../../frontend/src/pages/unauthorized.page.tsx); change the message there. `ProtectedRoute` only ever sees users who already have a role.

## 🏆 Benefits

- 2026-10-27: the "your card is in the app" message was first added to `ProtectedRoute`; its unit test passed, but no user could reach it, and members kept reading the old "ask for access". UI QA caught it on the rendered screen.

## 👀 Examples

### ✅ Good: the copy is in the page every refused user reaches

```tsx
<AuthHeading title="El panel es para los responsables de club">
  Tu carné está en la app Spain Aikikai: entra en ella con tu correo y tu contraseña.
</AuthHeading>
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
