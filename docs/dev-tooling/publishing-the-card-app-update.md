# 🎯 Publishing the card app update

## 💡 Convention

Card app (`mobile/`) changes reach phones with an over-the-air update, published **after** the push and **from the code on `origin/main`**:

1. Push `main` first, so the API the app needs is (or will be) deployed.
2. Create a detached worktree of `origin/main`, `npm ci` in its `mobile/`, typecheck, then
   `npx eas-cli update --channel production --platform android --message "<what changes>" --non-interactive`.
3. Remove the temporary worktree.
4. Check it with `npx eas-cli update:list --branch production --limit 2`.

Only Android is published. A phone downloads the update when it opens the app and applies it on the next start: tell clients to close the app fully and reopen it.

**A change that adds native code (a new Expo module or config plugin) never ships over the air.** The runtime follows the app version (`runtimeVersion.policy: appVersion`), so bump `expo.version` in `mobile/app.json` and ship a new EAS build; OTA updates then reach only the builds of that version. Runtime `1.0.0` is build 11 and earlier; `1.1.0` (Clerk Google sign-in) starts with the next build. Publishing native-dependent JavaScript to an older runtime crashes those phones on start.

A new build, from a detached worktree like the update:

1. Copy `mobile/credentials.json` and `mobile/keystore.jks` (ignored by git) into the worktree's `mobile/`; the production profile signs with local credentials.
2. `npx eas-cli build --platform android --profile production --non-interactive --no-wait`. It bumps `android.versionCode` in the worktree only: commit the same bump on `main`.
3. `npx eas-cli submit --platform android --profile store --id <build id> --non-interactive` uploads it to Play's **production** track as a draft. In Play Console add the release notes, save, and send the change for review from *Resumen de publicación*.

EAS installs with npm 10, which turns an optional peer of `@clerk/shared` into a second React and aborts `npm ci`; `mobile/.npmrc` sets `legacy-peer-deps=true` so it installs what the lockfile says. Check a dependency change with `npx npm@10.8.2 ci --dry-run` before building.

Store screenshots come from the Expo web app at `405x720` with scale 3 (1215x2160, the exact 9:16 Play requires) against a seeded QA database, with an invented member (`00000000T`), never a real one.

## 🏆 Benefits

- 2026-10-27: while publishing, the main checkout had been switched to another session's branch; publishing from it would have shipped that branch. A worktree of `origin/main` ships exactly what was pushed.
- Publishing after the push avoids an app calling an endpoint the server does not have yet.

## 👀 Examples

### ✅ Good: from a worktree of what was pushed

```bash
git worktree add .claude/worktrees/eas-main origin/main --detach
cd .claude/worktrees/eas-main/mobile && npm ci && npx tsc --noEmit
npx eas-cli update --channel production --platform android --message "Activa tu carné desde la app" --non-interactive
```

### ❌ Bad: from whatever the shared checkout holds

```bash
cd ~/Projects/react-fastapi-spainaikikai-admin/mobile && npx eas-cli update ...
```

## 🧐 Real world examples

- [`mobile/app.json`](../../mobile/app.json) (`updates.url`, runtime)

## 🔗 Related agreements

- [GitHub account for pushing](github-account.md)
- [Integrating a finished branch](../git/integrating-a-finished-branch.md)
