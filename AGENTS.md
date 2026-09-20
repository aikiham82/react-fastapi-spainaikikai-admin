# Useful commands

```bash
docker compose up -d                                  # MongoDB (port 27017)

cd backend  && poetry install
cd backend  && poetry run uvicorn src.main:app --reload   # API on :8000
cd backend  && poetry run pytest                          # suite + 80% coverage gate
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

- **MongoDB stores naive datetimes.** Use `datetime.utcnow()`, never `datetime.now(timezone.utc)`. A timezone-aware datetime written to Mongo compares incorrectly against every existing document.
- **`license_paid` derives from the licence *payment*, never from the federation `License` entity.** A member holding a `License` record has not necessarily paid for it.
- **Annual licence/cuota and insurance are two separate payment cycles.** The annual licence/cuota cycle is gated by the Excel column *"Fecha de envío"*: no date, not paid. Seguro de accidentes and RC form their own cycle and are **not** gated by that column. Treating them as one cycle marks every member as paid.
- **The database is `spainaikikai`**, not `aikikai_admin`.
- **No secrets in the repository.** Configuration comes from environment variables; `backend/.env*` is ignored except for `.env.example`.
- **Roles are two-level**: `User.global_role` (`super_admin` | `user`) plus `Member.club_role` (`admin` | `member`). The effective role is derived on the frontend; `/users/me` is enriched with `club_role` and `club_id`. Never gate on one level alone.

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
├── dev-tooling/
│   └── development-commands.md
├── documentation-guidelines.md
└── testing/
    └── testing-strategy.md
```

- When adding a document, follow [`docs/documentation-guidelines.md`](docs/documentation-guidelines.md): one document per convention, fixed template, and add it to the map above.

# Planning

- Plans live in `.agents/plans/{YYYY_MM_DD-semantic_name}/{YYYY_MM_DD-semantic_name}-plan.md`.
- Feature session context lives in `.claude/sessions/context_session_{feature_name}.md` and is updated as work progresses.
- Project-local subagents are defined in `.claude/agents/`.
