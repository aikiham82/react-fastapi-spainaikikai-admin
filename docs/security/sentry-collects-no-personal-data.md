# 🎯 Sentry collects no personal data

## 💡 Convention

Error reports leave the project with no member data. The backend sets `send_default_pii=False` and redacts emails in `before_send` and `before_breadcrumb`. The web sets `dataCollection` with every category off, and redacts emails and `token=` query values in `beforeSend` and `beforeBreadcrumb`. Both stay off unless their DSN variable is set (`SENTRY_DSN`, `VITE_SENTRY_DSN`); the DSNs live in Dokploy, never in the repository.

## 🏆 Benefits

- `@sentry/react` v11 replaced `sendDefaultPii` with `dataCollection`, and **leaving it unset now collects user info, cookies, headers, bodies and query strings**. Upgrading the SDK without setting it silently ships member data to a third party.
- The password reset link carries its token in the URL (`/reset-password?token=…`). A breadcrumb or a page URL would hand a working link to anyone who reads the issue.

## 👀 Examples

### ✅ Good: data collection stated explicitly

```typescript
Sentry.init({
  dsn,
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, stackFrameVariables: false },
  beforeSend: (event) => redact(event),
  beforeBreadcrumb: (breadcrumb) => redact(breadcrumb),
});
```

### ❌ Bad: relying on the SDK default

```typescript
Sentry.init({ dsn });   // v11: collects user info, cookies, headers and bodies
```

## 🧐 Real world examples

- [`backend/src/config/sentry.py`](../../backend/src/config/sentry.py)
- [`frontend/src/core/monitoring/sentry.ts`](../../frontend/src/core/monitoring/sentry.ts)

## 🔗 Related agreements

- [Security guidelines](security-guidelines.md)
- [No production data in the repository](../testing/no-production-data.md)
