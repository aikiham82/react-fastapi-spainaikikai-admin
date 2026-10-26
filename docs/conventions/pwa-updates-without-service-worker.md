# 🎯 The admin PWA updates without a service worker

## 💡 Convention

The installable admin web has **no service worker**. It stays fresh after a deploy through three pieces, and a change that touches any of them keeps the other two working:

1. nginx sends `Cache-Control: no-cache` for `index.html`, so every load revalidates it. Hashed assets keep their one-year immutable cache.
2. `useNewVersionNotice` compares the entry script of the live `index.html` with the loaded one when the tab becomes visible or the window regains focus, and offers "Recargar".
3. `lazyWithRetry` reloads once per loaded version when a lazy page chunk is gone. A second failure on the same version throws instead of looping.

Do not add `vite-plugin-pwa`, Workbox or a hand-written service worker unless the app must work offline. If one is ever added, it must call `skipWaiting` and hook into the same notice.

## 🏆 Benefits

- A caching service worker is the usual reason users keep running an old build for days. Without one, the browser always asks nginx for `index.html`.
- No build plumbing: each Vite build renames the entry script (`/assets/index-<hash>.js`), and that name is the version.
- An open tab or installed window learns about a deploy without the user closing the app.

## 👀 Examples

### ✅ Good: detect a deploy from the entry script

```ts
const deployedPage = new DOMParser().parseFromString(await response.text(), 'text/html')
return entryScript(deployedPage) !== entryScript(document)
```

### ❌ Bad: a caching service worker for an online-only admin

```ts
VitePWA({ registerType: 'prompt', workbox: { globPatterns: ['**/*.{js,css,html}'] } })
```

It serves the precached `index.html` until the new worker activates, which is the stale-version problem this convention avoids.

### ❌ Bad: a reload flag that is never tied to a version

```ts
if (!sessionStorage.getItem('chunk_reload')) { sessionStorage.setItem('chunk_reload', '1'); location.reload() }
```

After the first deploy the flag stays set, so the next stale chunk in the same tab breaks the page instead of reloading.

## 🧐 Real world examples

- [`frontend/nginx.conf`](../../frontend/nginx.conf): `location = /index.html` with `no-cache`.
- [`frontend/src/core/hooks/useNewVersionNotice.ts`](../../frontend/src/core/hooks/useNewVersionNotice.ts)
- [`frontend/src/core/utils/lazyWithRetry.ts`](../../frontend/src/core/utils/lazyWithRetry.ts)
- [`frontend/src/core/utils/entryScript.ts`](../../frontend/src/core/utils/entryScript.ts)

## 🔗 Related agreements

- [`frontend.md`](frontend.md)
- [`../architecture/frontend-features.md`](../architecture/frontend-features.md)
