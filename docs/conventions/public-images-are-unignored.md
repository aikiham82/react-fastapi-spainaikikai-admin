# 🎯 Images a workspace ships are unignored explicitly

## 💡 Convention

The root `.gitignore` ignores every `*.png`, so screenshots from QA never get committed. A folder whose images are part of the product needs its own `!folder/*.png` line, and a new image is checked with `git status` before the commit. Today that covers `mobile/assets/` and `frontend/public/`.

## 🏆 Benefits

- 2026-10-25: the PWA icons were added to `frontend/public/`, the build looked right locally, and production answered 404 for all three. `git add -A` had silently skipped them, so the admin web was not installable.
- A headless Chromium installability check (`Page.getInstallabilityErrors`) does not download the icons, so it reports no error even when they are missing. Fetching each icon from the deployed site is the check that catches it.

## 👀 Examples

### ✅ Good: the folder is unignored and the file shows up as added

```gitignore
*.png
!mobile/assets/*.png
!frontend/public/*.png
```

```
$ git status --short
A  frontend/public/icon-512.png
```

### ❌ Bad: the image is referenced but never tracked

```
$ git check-ignore -v frontend/public/icon-512.png
.gitignore:40:*.png	frontend/public/icon-512.png
```

## 🧐 Real world examples

- [`.gitignore`](../../.gitignore)
- [`manifest.webmanifest`](../../frontend/public/manifest.webmanifest)

## 🔗 Related agreements

- [Project layout](../architecture/project-layout.md)
