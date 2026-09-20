---
name: "Port the Codely harness structure to spainaikikai-admin"
description: "Replace the monolithic CLAUDE.md with a thin AGENTS.md plus a task-indexed docs/ taxonomy, mirroring the colegiala-voice-agent harness, without losing any existing documentation, session history or memory."
created_at: "2026-09-20T20:10:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5"
    reasoning_effort: "high"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5"
    reasoning_effort: "high"

last_implementation_at: "2026-09-20T21:05:00Z"
has_completed_all_phases: "true"
---

# Port the Codely harness structure to spainaikikai-admin

## 🎯 Goal

Replace the 319-line monolithic `CLAUDE.md` with a thin, hand-written `AGENTS.md` (with `CLAUDE.md` as a symlink) plus a domain-indexed `docs/` tree, following the `colegiala-voice-agent` harness pattern. Every existing plan, feature doc, session file and memory must survive the move.

## 👀 Context

### Reference harness: `/home/abraham/Projects/colegiala-voice-agent`

The pattern being ported:

- `AGENTS.md` (~3.7 KB) with exactly five sections: **Useful commands** → **Architecture** → **Non-negotiables** → **Documentation** → **Planning**.
- `CLAUDE.md` is a symlink to `AGENTS.md`, giving one source of truth for Claude Code, Cursor and Codex.
- The **Documentation** section embeds the `docs/` tree as a lookup map, prefixed with an explicit *"Do NOT read all docs upfront"* instruction. Agents read only the docs their task touches.
- **Non-negotiables** are phrased as hard rules: *"These are project rules, not preferences. Breaking one is a defect even if the tests pass."*
- Plans live in `.agents/plans/{YYYY_MM_DD-semantic_name}/{same_name}-plan.md`. Completed plans keep their frontmatter and gain `implemented_by`, `last_implementation_at` and `has_completed_all_phases` as an audit trail.
- The reference `.claude/` directory contains **no files at all** — all durable instruction lives in `AGENTS.md` + `docs/`.
- `docs/documentation-guidelines.md` enforces **one document per convention** with a fixed template: `# 🎯 Name` → `## 💡 Convention` → `## 🏆 Benefits` → `## 👀 Examples` (a ✅ Good and a ❌ Bad case) → `## 🧐 Real world examples` (links to files following it) → `## 🔗 Related agreements`. The stated rationale is that agents can load a single convention without pulling in the whole knowledge base, and each convention becomes independently reviewable in a PR. The explicit anti-pattern is the monolithic file — which is exactly what `CLAUDE.md` is today.
- `docs/git/commit-messages.md` uses emoji Conventional Commits (`✨ feat`, `🐛 fix`, `📝 docs`, `♻️ refactor`, `✅ test`, `🔧 chore`, `⚡️ perf`, `🚀 ci`), where the emoji encodes the **type**, not mood. This already matches this repository's recent history.

### Current state of this project

Root instruction file:

- [`CLAUDE.md`](../../../CLAUDE.md): 319 lines. Lines 1–202 are hand-written (overview, commands, architecture, conventions, testing, security, workflow rules, subagent management). Lines 203–319 are an auto-generated `autoskills` digest.
- There is **no** root `AGENTS.md` today.

Harness assets spread across six overlapping systems:

| Location | Contents | Git status |
|---|---|---|
| [`.claude/agents/`](../../../.claude/agents) | 5 custom agents | tracked |
| [`.claude/commands/`](../../../.claude/commands) | 5 slash commands | tracked |
| [`.claude/skills/`](../../../.claude/skills) | 8 skill dirs | partly untracked |
| [`.claude/doc/`](../../../.claude/doc) | 23 feature dirs (acceptance criteria, feedback reports, screenshots) | tracked |
| [`.claude/sessions/`](../../../.claude/sessions) | 34 `context_session_*.md` + 13 screenshots (48 files) | tracked |
| [`.planning/`](../../../.planning) | 37 files (ROADMAP, PROJECT, REQUIREMENTS, STATE, codebase/, research/, phases/) | tracked |
| [`docs/`](../../../docs) | 15 files (plans/, superpowers/, agent_outputs/) | tracked |
| [`.cursor/rules/`](../../../.cursor/rules) | 12 `.mdc` rule files | tracked |
| `.omc/` | oh-my-claudecode local state | untracked + ignored |
| `.trees/` | empty except `.gitkeep` | tracked |

### ⚠️ Blocking precondition: `.gitignore`

[`.gitignore`](../../../.gitignore) currently contains:

```
.claude/sessions
.claude/doc
.claude/plans
docs/
```

The files already in those paths are tracked, so git history protects them. But **any new file added under `docs/` would be silently ignored**, which would make this entire restructure uncommittable. Removing the `docs/` entry is the first action of Phase 1 and must land before any new doc is written.

### Subagent routing discrepancy

`CLAUDE.md` routes work to 8 subagent names, but only 5 definitions exist in `.claude/agents/`. These four resolve from the global `~/.claude/agents/`: `shadcn-ui-architect`, `qa-criteria-validator`, `ui-ux-analyzer`, `frontend-test-engineer`. The new `docs/workflow/subagents.md` must state which are project-local and which are global, so a fresh clone does not silently lose routing.

### Memory to promote into the repository

Four files in `~/.claude/projects/-home-abraham-Projects-react-fastapi-spainaikikai-admin/memory/` hold hard-won operational rules that currently live **outside** the repo, where a fresh agent or a teammate never sees them:

- `incident_club_summary_license_paid_source.md`: `license_paid` must derive from the license **payment**, not the federation `License` entity.
- `incident_excel_import_marks_everyone_paid.md`: two distinct payment cycles; annual license/cuota is gated by *"Fecha de envío"*, while seguro accidentes + RC is a separate ungated cycle.
- `incident_invoice_adapter_field_mismatch.md`: `calculate_totals` alias mismatch causing a latent `TypeError` reading invoices.
- `reference_role_system.md`: two-level roles (`User.global_role` + `Member.club_role`).

Plus two rules from `MEMORY.md`: MongoDB stores **naive** datetimes (use `datetime.utcnow()`, never `datetime.now(timezone.utc)`), and the database is named `spainaikikai`.

These become the **Non-negotiables** section of `AGENTS.md`, expanded in `docs/domain/`. The memory files themselves stay where they are; this duplicates them into the repo, it does not move them.

### Verification commands

- Backend (from `/backend`): `poetry run pytest --cov=src --cov-report=term-missing` (fails under 80% coverage; markers: `unit`, `integration`, `slow`, `auth`, `api`, `service`, `repository`, `domain`).
- Frontend (from `/frontend`): `npm run lint`, `npm run build` (`tsc -b && vite build`), `npm run test` (Vitest).
- Mobile (from `/mobile`): Expo; no lint or test script defined.

This task changes only Markdown, a symlink and `.gitignore`, so verification per phase is: the docs tree matches the map in `AGENTS.md`, every relative link resolves, `git status` shows the intended files as staged rather than ignored, and the backend/frontend suites remain green (unaffected but confirmed).

## 📜 Public contracts

No application services, domain events, database schemas or end-user copy change. The contracts here are the instruction files agents depend on.

### Phase 1

Created:
- `AGENTS.md`: sections **Useful commands**, **Architecture**, **Non-negotiables**, **Documentation**, **Planning**.
- `docs/documentation-guidelines.md`
- `docs/architecture/backend-hexagonal.md`
- `docs/architecture/frontend-features.md`
- `docs/architecture/project-layout.md`
- `docs/dev-tooling/development-commands.md`
- `docs/testing/testing-strategy.md`

Modified:
- `.gitignore`: remove the `docs/` entry.

Replaced:
- `CLAUDE.md`: regular file becomes a symlink to `AGENTS.md`.

### Phase 2

Created:
- `docs/conventions/backend.md`
- `docs/conventions/frontend.md`
- `docs/security/security-guidelines.md`
- `docs/git/commit-messages.md`
- `docs/workflow/feature-workflow.md` (the Phase 1–3 session rules)
- `docs/workflow/subagents.md` (routing table, local vs global)
- `docs/plans/how-to-create-a-plan.md`
- `docs/dev-tooling/skills.md` (replaces the inlined `autoskills` digest)

Modified:
- `AGENTS.md`: **Documentation** map extended with the new paths.

### Phase 3

Created:
- `docs/domain/data-model.md`
- `docs/domain/roles-and-permissions.md`
- `docs/domain/payment-cycles.md`
- `docs/history/README.md` (index explaining what was archived and when)

Moved (via `git mv`, history preserved):
- `.planning/**` → `docs/history/planning/**`
- `.claude/doc/**` → `docs/history/feature-docs/**`

Deleted:
- `.trees/` (empty but for `.gitkeep`)

Unchanged by explicit decision:
- `.claude/sessions/` stays in place; the Phase 1–3 workflow writes to it live.
- `.claude/agents/`, `.claude/commands/`, `.claude/skills/`, `.claude/settings*.json` stay in place.
- `.omc/` and `.cursor/rules/` are left untouched.
- The external memory directory is left untouched.

## 🪜 Phases

### Phase 1: Navigable AGENTS.md with the core docs

Deliver a working harness skeleton an agent can actually use: unblock `docs/` in git, write the thin `AGENTS.md` including the Non-negotiables, point `CLAUDE.md` at it, and fill in the three highest-traffic doc domains (architecture, commands, testing). After this phase the new harness is usable end-to-end even though the process docs are still to come.

- [x] Remove the `docs/` entry from `.gitignore` and confirm with `git check-ignore -v docs/architecture/backend-hexagonal.md` that new docs are no longer ignored.
- [x] Write `docs/documentation-guidelines.md` adopting the reference template (`## 💡 Convention`, `## 🏆 Benefits`, `## 👀 Examples` with a ✅ Good and a ❌ Bad case, `## 🧐 Real world examples`, `## 🔗 Related agreements`) and the one-document-per-convention rule. Write this first, because every doc produced in this phase and the next two must follow it.
- [x] Write `docs/architecture/backend-hexagonal.md` from `CLAUDE.md` lines 87–106: domain/application/infrastructure layers, entity validation in `__post_init__`, ports as abstract contracts, one public `execute` per use case, Motor repositories, DTO/mapper/dependency split.
- [x] Write `docs/architecture/frontend-features.md` from `CLAUDE.md` lines 107–126: feature folder shape, `components/`, `data/` (Zod schemas + axios services), `hooks/` with context/business/mutations/queries, `src/core/`, `src/components/ui/`.
- [x] Write `docs/architecture/project-layout.md`: the backend/frontend/mobile workspace split and the important entry points (`backend/src/app.py`, `backend/src/main.py`, `frontend/src/main.tsx`, `backend/pytest.ini`).
- [x] Write `docs/dev-tooling/development-commands.md` from `CLAUDE.md` lines 15–84: Poetry, uvicorn, pytest variants, npm scripts, Expo, `docker compose up -d`, plus the ports (backend 8000, frontend 5173, MongoDB 27017).
- [x] Write `docs/testing/testing-strategy.md` from `CLAUDE.md` lines 146–151: layer-based organisation, the 80% coverage gate, and the pytest markers.
- [x] Write `AGENTS.md` with the five reference sections. **Non-negotiables** must carry, as hard rules: naive datetimes via `datetime.utcnow()`; `license_paid` derives from the license payment, not the `License` entity; annual licence/cuota is gated by *"Fecha de envío"* while insurance is a separate ungated cycle; the database is `spainaikikai`; no secrets in the repository. **Documentation** embeds the `docs/` tree with the "Do NOT read all docs upfront" instruction.
- [x] Delete the old `CLAUDE.md` and recreate it as a symlink: `ln -s AGENTS.md CLAUDE.md`. Verify `git status` records it as a typechange and that `cat CLAUDE.md` resolves.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (backend `poetry run pytest`, frontend `npm run lint && npm run build`). Additionally confirm every relative link in `AGENTS.md` resolves and that the new docs appear in `git status` rather than being ignored. Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: The process layer

Move the conventions, security, git and workflow rules out of the old monolith into their own docs, and replace the inlined `autoskills` digest with a maintained skills doc. This is what makes the harness prescriptive rather than merely descriptive.

- [x] Write `docs/conventions/backend.md` from `CLAUDE.md` lines 129–136: dependency injection in the web layer, constructor-injection + single `execute`, validation in `__post_init__`, Motor repositories, Pydantic DTOs, domain-exception to HTTP-status mapping.
- [x] Write `docs/conventions/frontend.md` from `CLAUDE.md` lines 137–145: context provider + hook per feature, `use{Feature}Context` vs `use{Feature}`, the `{action, isLoading, error, isSuccess}` mutation shape, axios services, Zod typing.
- [x] Write `docs/security/security-guidelines.md` from `CLAUDE.md` lines 152–157: OAuth2 + JWT, bcrypt hashing, protected routes on both sides, environment-based configuration, and the pre-commit secret checks.
- [x] Write `docs/git/commit-messages.md`: emoji Conventional Commits (`✨ feat`, `🐛 fix`, `📝 docs`, `♻️ refactor`, `✅ test`, `🔧 chore`, `⚡️ perf`, `🚀 ci`) where the emoji encodes the type rather than mood, English imperative descriptions of at most 72 characters, a body explaining *why* rather than what, one decision per commit, and the required `Co-Authored-By` attribution line.
- [x] Write `docs/workflow/feature-workflow.md` from `CLAUDE.md` lines 169–182: the Phase 1–3 rules and the `.claude/sessions/context_session_{feature_name}.md` contract, stating that sessions remain under `.claude/sessions/`.
- [x] Write `docs/workflow/subagents.md` from `CLAUDE.md` lines 183–202: the 8-agent routing table, explicitly marking `backend-developer`, `backend-test-engineer`, `frontend-developer`, `playwright-link-scraper` and `web-content-summarizer` as project-local, and `shadcn-ui-architect`, `qa-criteria-validator`, `ui-ux-analyzer`, `frontend-test-engineer` as resolved from the global agents directory.
- [x] Write `docs/plans/how-to-create-a-plan.md` adapting the Codely methodology to this stack: name the relevant public-contract types here (use cases and their `execute` signatures, repository ports and their Mongo adapters, pytest suites and cases, MongoDB collection shapes, Spanish end-user copy).
- [x] Write `docs/dev-tooling/skills.md` listing the 8 skill directories with one line each, replacing the auto-generated block that used to sit in `CLAUDE.md`.
- [x] Extend the **Documentation** map in `AGENTS.md` with all paths added in this phase.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Additionally confirm the `docs/` tree in `AGENTS.md` matches the real tree and that every relative link resolves. Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 3: Domain knowledge and legacy archival

Promote the external memory into versioned domain docs, then consolidate the overlapping legacy planning systems under `docs/history/` so the repo presents one harness instead of six.

- [x] Write `docs/domain/roles-and-permissions.md` from `reference_role_system.md`: `User.global_role` (`super_admin` | `user`), `Member.club_role` (`admin` | `member`), how the frontend derives the effective role, the `/users/me` enrichment, and the `usePermissions.ts` / `canAccess()` / `filteredNavItems` gating.
- [x] Write `docs/domain/payment-cycles.md` from the two payment incidents: the annual licence/cuota cycle gated by *"Fecha de envío"*, the separate ungated seguro accidentes + RC cycle, and the rule that `license_paid` comes from the payment record.
- [x] Write `docs/domain/data-model.md`: the MongoDB collections behind clubs, members, payments, seminars, licences and invoices, plus the naive-datetime storage rule and the `spainaikikai` database name.
- [x] Cross-link each **Non-negotiable** in `AGENTS.md` to the `docs/domain/` page that explains it.
- [x] `git mv .planning docs/history/planning` and `git mv .claude/doc docs/history/feature-docs`, then confirm with `git log --follow` on one file from each that history survived the move.
- [x] Write `docs/history/README.md` explaining what each archived tree was, that it is kept for reference only, and that current work uses `.agents/plans/` and `.claude/sessions/`.
- [x] Remove the now-stale `.claude/doc` entry from `.gitignore` and delete the empty `.trees/` directory.
- [x] Extend the **Documentation** map in `AGENTS.md` with `docs/domain/` and `docs/history/`.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Additionally confirm no file was lost by comparing `git ls-files | wc -l` before and after the moves, and that every relative link resolves. Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

All phases are complete. The harness is now a 79-line `AGENTS.md` indexing 18 documents under `docs/`, with the legacy planning systems archived under `docs/history/`.

Two follow-ups fell out of the work and are **not** part of this plan:

- The Poetry environment targets Python 3.12 while the system runs 3.14.4, so `poetry run pytest` cannot start. The backend suite is currently unrunnable.
- `npm run lint` (122 errors) and `npm run build` both fail on pre-existing issues confined to `frontend/src/test-utils/` and `__tests__/`.

Monolith cracked open, conventions set free, memory made permanent, archives filed by 🗺️ 🧠 📦 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
