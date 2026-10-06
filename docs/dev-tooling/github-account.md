# 🎯 GitHub account for pushing

## 💡 Convention

The remote is `aikiham82/react-fastapi-spainaikikai-admin`, and `gh` on this machine holds three logged-in accounts. Pushing works only while **`aikiham82`** is the active one. Any other active account answers `403`, however valid its token.

When the active account is another one, note which one it is, switch, push, and switch back to **that** account, so nothing else on the machine is left pointing at a different identity. Never hardcode the account you restore: the one active before the push changes from day to day (`Abraham-Hdez`, `realcofamily`, …).

## 🏆 Benefits

- The `403` says `Permission to aikiham82/... denied to <other account>`, which reads like a repository permission problem and sends you looking at collaborator settings instead of at `gh auth status`.
- Switching back keeps the change scoped to the push. The active account is global to `gh`, so leaving it switched changes what every other repository and session on the machine pushes as.
- The failure appears only at push time, after the merge and the suites, which is the worst moment to start debugging credentials.

## 👀 Examples

### ✅ Good: remember the active account, push, restore it

```bash
previous=$(gh api user --jq .login)
gh auth switch --user aikiham82
git push origin main
gh auth switch --user "$previous"
```

### ✅ Good: check first when a push is refused

```bash
gh auth status
# ✓ Logged in to github.com account Abraham-Hdez (keyring)
#   - Active account: true        ← this is the problem
# ✓ Logged in to github.com account aikiham82 (keyring)
#   - Active account: false
```

### ❌ Bad: reading the 403 as a permissions problem

```
remote: Permission to aikiham82/react-fastapi-spainaikikai-admin.git denied to Abraham-Hdez.
fatal: ... The requested URL returned error: 403
```

Nothing is wrong with the repository or the token. The wrong account is active.

### ❌ Bad: restoring a hardcoded account

```bash
gh auth switch --user aikiham82
git push origin main
gh auth switch --user Abraham-Hdez   # but realcofamily was the active one
```

It leaves the machine on an account nobody chose.

### ❌ Bad: switching and leaving it switched

It fixes this push and silently changes the identity of the next one, in whatever other project happens to push next.

## 🧐 Real world examples

- Commit `544080b` was merged and verified locally, then failed to push until the account was switched.
- Commit `37fa1fe` (SPAIN-AIKIKAI-3) was refused with `denied to realcofamily`: the active account was neither `aikiham82` nor `Abraham-Hdez`. It was pushed as `aikiham82` and `realcofamily` restored.

## 🔗 Related agreements

- [`../git/integrating-a-finished-branch.md`](../git/integrating-a-finished-branch.md): pushing `main` is the last step of an integration, and it triggers the deploy.
- [`development-commands.md`](development-commands.md): the rest of the commands this project needs.

Pushed under the right name by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
