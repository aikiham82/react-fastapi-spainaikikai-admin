# 🎯 Archived harness material

## 💡 Convention

This folder holds superseded planning and feature documentation, kept for reference. **Nothing here describes how the project works today.** For current conventions, start at [`../../AGENTS.md`](../../AGENTS.md).

### `planning/`

Previously `.planning/` at the repository root: a phase-based planning system with `ROADMAP.md`, `PROJECT.md`, `REQUIREMENTS.md`, `STATE.md`, a `codebase/` survey, a `research/` folder and per-phase plans under `phases/`. Useful as a record of how the seminar cover image and the oficialidad payment flow were approached.

### `feature-docs/`

Previously `.claude/doc/`: 23 feature directories of acceptance criteria, feedback reports, validation notes and UI screenshots, produced by subagents during earlier features. Covers annual payments, club auth, import/export, the responsive overhaul, Redsys, licence permissions and others.

Screenshots in these folders stay untracked: the repository ignores `*.png` except under `mobile/assets/`. They exist on disk but are not in git history.

### Where current work lives

| Purpose | Location |
|---|---|
| Conventions | [`../`](..) indexed from [`../../AGENTS.md`](../../AGENTS.md) |
| Plans | [`../../.agents/plans/`](../../.agents/plans) |
| Live feature context | [`../../.claude/sessions/`](../../.claude/sessions) |

## 🏆 Benefits

- One harness is discoverable instead of six overlapping ones.
- The reasoning behind past features stays available without competing with current documentation.
- Moving with `git mv` preserved history, so `git log --follow` still works on every archived file.

## 👀 Examples

### ✅ Good: reading an archive for background

```bash
git log --follow docs/history/planning/ROADMAP.md
```

### ❌ Bad: treating an archived document as current

A file here may describe a plan that was changed or abandoned. Check [`../../AGENTS.md`](../../AGENTS.md) and the `docs/` tree before acting on anything in this folder.

## 🔗 Related agreements

- [`../documentation-guidelines.md`](../documentation-guidelines.md)
- [`../workflow/feature-workflow.md`](../workflow/feature-workflow.md)
- [`../plans/how-to-create-a-plan.md`](../plans/how-to-create-a-plan.md)
