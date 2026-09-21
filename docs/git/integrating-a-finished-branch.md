# 🎯 Git: integrating a finished branch

## 💡 Convention

When a branch is finished, integration goes through **local `main`**: merge the branch into local `main`, run the suites on the merge result, and only then push `main`. Never push a feature branch to `origin` on its own, and do not open a pull request unless the user asks for one.

Pushing `main` triggers the auto-deploy, so it is the last step and it happens only when the user asks for it.

## 🏆 Benefits

- The tests run against the code that will actually be deployed. A branch that is green on its own can still break once `main` has moved underneath it.
- The remote keeps one line of history instead of collecting abandoned feature branches nobody deletes.
- The merge commit is the unit that gets deployed, so a revert removes the whole feature rather than half of it.
- Conflicts surface on the developer's machine, where they can be resolved with the suites at hand, instead of in a pull request.

## 👀 Examples

### ✅ Good: integrate locally, verify the merge, then push

```bash
git checkout main && git pull --ff-only
git merge --no-ff <branch> -m "<type>(<scope>): <description>"

cd backend  && poetry run pytest                      # on the MERGE RESULT
cd frontend && npm run lint && npm run build && npm run test

git push origin main                                  # triggers the deploy

git worktree remove .claude/worktrees/<name>
git branch -d <branch>
```

The suites run after the merge, so they see `main` plus the branch. The worktree and the branch disappear once their content lives in `main`.

### ❌ Bad: push the branch and hand over a pull request link

```bash
git push -u origin HEAD:feat/<name>
# "PR ready to open: https://github.com/.../pull/new/feat/<name>"
```

Nothing was verified against `main`, the work is not integrated, and the remote gains a branch that has to be cleaned up later. The deliverable is `main`, not a branch sitting on GitHub.

### ❌ Bad: run the suites on the branch and push the merge untested

```bash
git checkout <branch> && poetry run pytest    # green here
git checkout main && git merge --no-ff <branch>
git push origin main                          # never ran again
```

Green on the branch says nothing about green after the merge. If `main` moved, the deployed commit is one nobody tested.

## 🧐 Real world examples

- `82e3f5d`: the admin password reset link feature, merged into local `main` with `--no-ff` after the branch had merged `main` into itself, verified with the full suites on the merge result, then pushed.

## 🔗 Related agreements

- [`commit-messages.md`](commit-messages.md): the format of the merge commit message.
- [`../dev-tooling/development-commands.md`](../dev-tooling/development-commands.md): the verification commands to run on the merge result.
- [`../workflow/feature-workflow.md`](../workflow/feature-workflow.md): what happens before a branch is finished.

Integrated straight into main by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
