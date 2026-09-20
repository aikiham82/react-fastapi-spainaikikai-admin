# Useful commands

```bash
docker compose up -d                                  # MongoDB (port 27017)

cd backend  && poetry install
cd backend  && poetry run uvicorn src.main:app --reload   # API on :8000
cd backend  && poetry run pytest                          # suite + coverage gate (floor 50%)
cd backend  && poetry run pytest -m unit                  # fast loop

cd frontend && npm install
cd frontend && npm run dev                                # UI on :5173
cd frontend && npm run lint
cd frontend && npm run build                              # tsc -b && vite build
cd frontend && npm run test                               # vitest

cd mobile   && npm run start                              # expo
```

Before every commit: `cd backend && poetry run pytest` and `cd frontend && npm run lint && npm run build && npm run test` must pass.

# Architecture

- Three independent workspaces, no root toolchain: `backend/` (FastAPI + Motor + Poetry), `frontend/` (React 19 + TypeScript + Vite), `mobile/` (Expo).
- **Backend is hexagonal.** `src/domain/` (entities, exceptions) ← `src/application/` (ports, use cases) ← `src/infrastructure/` (Mongo adapters, FastAPI web layer). Dependencies point inwards only. One public `execute` per use case. Nothing outside `adapters/` imports Motor.
- **Frontend is feature-based.** Everything a feature needs lives in `src/features/{feature}/` as `components/`, `data/` (Zod schemas + axios services) and `hooks/` (context, business, `queries/`, `mutations/`). Shared code is promoted to `src/core/`; UI primitives live in `src/components/ui/`.
- Persistence is MongoDB, database name `spainaikikai`.

# Non-negotiables

These are project rules, not preferences. Breaking one is a defect even if the tests pass. Each was learned from a production bug.

- **MongoDB stores naive datetimes.** Use `datetime.utcnow()`, never `datetime.now(timezone.utc)`. A timezone-aware datetime written to Mongo compares incorrectly against every existing document. → [`docs/domain/data-model.md`](docs/domain/data-model.md)
- **`license_paid` derives from the licence *payment*, never from the federation `License` entity.** A member holding a `License` record has not necessarily paid for it. → [`docs/domain/payment-cycles.md`](docs/domain/payment-cycles.md)
- **Annual licence/cuota and insurance are two separate payment cycles.** The annual licence/cuota cycle is gated by the Excel column *"Fecha de envío"*: no date, not paid. Seguro de accidentes and RC form their own cycle and are **not** gated by that column. Treating them as one cycle marks every member as paid. → [`docs/domain/payment-cycles.md`](docs/domain/payment-cycles.md)
- **The database is `spainaikikai`**, not `aikikai_admin`. → [`docs/domain/data-model.md`](docs/domain/data-model.md)
- **No secrets in the repository.** Configuration comes from environment variables; `backend/.env*` is ignored except for `.env.example`. → [`docs/security/security-guidelines.md`](docs/security/security-guidelines.md)
- **Roles are two-level**: `User.global_role` (`super_admin` | `user`) plus `Member.club_role` (`admin` | `member`). The effective role is derived on the frontend; `/users/me` is enriched with `club_role` and `club_id`. Never gate on one level alone. → [`docs/domain/roles-and-permissions.md`](docs/domain/roles-and-permissions.md)

# Documentation

- Detailed conventions with examples live in `docs/`.
- **Do NOT read all docs upfront.**
- When working on a task, use this map to find and read only the docs relevant to your task:

```
docs/
├── architecture/
│   ├── backend-hexagonal.md
│   ├── frontend-features.md
│   └── project-layout.md
├── conventions/
│   ├── backend.md
│   └── frontend.md
├── dev-tooling/
│   ├── development-commands.md
│   └── skills.md
├── documentation-guidelines.md
├── domain/
│   ├── data-model.md
│   ├── payment-cycles.md
│   └── roles-and-permissions.md
├── git/
│   └── commit-messages.md
├── history/            (archived, not current — see its README)
├── plans/
│   └── how-to-create-a-plan.md
├── security/
│   └── security-guidelines.md
├── testing/
│   └── testing-strategy.md
└── workflow/
    ├── feature-workflow.md
    └── subagents.md
```

- When adding a document, follow [`docs/documentation-guidelines.md`](docs/documentation-guidelines.md): one document per convention, fixed template, and add it to the map above.

# Planning

- When creating a plan, you MUST first read and follow [`docs/plans/how-to-create-a-plan.md`](docs/plans/how-to-create-a-plan.md).
- Plans live in `.agents/plans/{YYYY_MM_DD-semantic_name}/{YYYY_MM_DD-semantic_name}-plan.md`.
- Features follow the three-phase workflow in [`docs/workflow/feature-workflow.md`](docs/workflow/feature-workflow.md), with context kept in `.claude/sessions/context_session_{feature_name}.md`.
- Route work to subagents using [`docs/workflow/subagents.md`](docs/workflow/subagents.md). Five are project-local in `.claude/agents/`; four resolve from the global agents directory.
