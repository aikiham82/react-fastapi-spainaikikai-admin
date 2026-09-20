# 🎯 How to create a plan

## 💡 Convention

Before implementing anything non-trivial, write a plan and get it agreed.

1. **Explore with subagents**, not by reading the codebase yourself. Give each a narrow assignment and ask for file paths, existing contracts and conventions rather than file dumps.
2. **Agree the number of phases** with the user: minimum (1), intermediate (1–3) or very granular (more than 3).
3. **Specify the public contracts** each phase creates, modifies or deletes. Ask the user; if they do not specify, propose them. Omit any contract type the task does not touch.
4. **Get approval before writing the plan file.** Do not create it until the contracts and phases are agreed.
5. **Save it** as `.agents/plans/{YYYY_MM_DD-semantic_name}/{YYYY_MM_DD-semantic_name}-plan.md`.

### Public contract types in this project

- **Use cases** and their `execute` signatures.
- **Repository ports** (`application/ports/`) and their MongoDB adapters.
- **HTTP endpoints**: method, path, request DTO and response DTO.
- **MongoDB collection shapes**, including new or changed fields.
- **Test suites** and the individual test cases inside them.
- **Spanish end-user copy** shown in the UI or in emails.

### Phase rules

- Each phase is a **vertical slice**: UI, backend and persistence together for one behaviour, never one layer at a time.
- Each phase must be committable on its own with the suite green.
- Phase 1 should produce something the user can see or run, so direction can be corrected early.
- Every phase ends with these two actions, in order:
  1. Verify typechecking, linting and tests with the project's verification commands. Fix issues if any.
  2. STOP. Present the changes and suggest commit messages. Do not continue without explicit approval.

Write plans in English, even when the conversation is in another language.

## 🏆 Benefits

- Agreeing contracts first surfaces disagreement while it costs a sentence rather than a rewrite.
- Vertical slices mean every phase ships working behaviour instead of scaffolding nobody can evaluate.
- A phase that stops for review keeps a long task steerable.
- Plans stored in the repository leave a record of why the work was shaped the way it was.

## 👀 Examples

### ✅ Good: a vertical slice

> **Phase 1**: register a manual payment. Zod schema, service, mutation hook, modal component, `RegisterManualPaymentUseCase`, Mongo adapter and their tests. Happy path only.
> **Phase 2**: validation rules and corner cases, with tests.

Phase 1 is demonstrable. Phase 2 hardens it.

### ❌ Bad: horizontal layers

> **Phase 1**: create all the endpoints.
> **Phase 2**: create the use cases they call.
> **Phase 3**: create the UI.

Nothing works until Phase 3, so nothing can be reviewed until then, and Phase 1 cannot be committed with a green suite.

## 🧐 Real world examples

- [`.agents/plans/`](../../.agents/plans): plans written under this convention.
- [`2026-06-13-gestion-pagos-admin-plan.md`](2026-06-13-gestion-pagos-admin-plan.md)
- [`2026-02-06-seminars-club-filtering-plan.md`](2026-02-06-seminars-club-filtering-plan.md)

## 🔗 Related agreements

- [`../workflow/feature-workflow.md`](../workflow/feature-workflow.md)
- [`../workflow/subagents.md`](../workflow/subagents.md)
- [`../git/commit-messages.md`](../git/commit-messages.md)
