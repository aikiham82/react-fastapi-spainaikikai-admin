# 🎯 Subagent routing

## 💡 Convention

Route work to the subagent that owns the area, and prefer launching independent ones in parallel.

| Subagent | Consult for | Defined in |
|---|---|---|
| `backend-developer` | backend business logic, before implementing | `.claude/agents/` (project) |
| `backend-test-engineer` | backend test cases, after implementing | `.claude/agents/` (project) |
| `frontend-developer` | client-side business logic, before building UI | `.claude/agents/` (project) |
| `playwright-link-scraper` | browser automation and scraping | `.claude/agents/` (project) |
| `web-content-summarizer` | condensing external pages or documents | `.claude/agents/` (project) |
| `shadcn-ui-architect` | building or tweaking UI | `~/.claude/agents/` (global) |
| `ui-ux-analyzer` | UI review, polish and visual consistency | `~/.claude/agents/` (global) |
| `frontend-test-engineer` | frontend test cases, after implementing | `~/.claude/agents/` (global) |
| `qa-criteria-validator` | validating a finished implementation against acceptance criteria | `~/.claude/agents/` (global) |

**Five of the nine are project-local and travel with the repository. Four resolve from the global agents directory**, so a fresh clone on another machine will not find them unless that machine has them. If a routing call fails, check which column the agent is in before assuming the name is wrong.

Subagents **research and report**. The main agent does the implementation. Always pass the session file (`.claude/sessions/context_session_{feature_name}.md`) when delegating, and read whatever documentation the subagent produces before acting on it.

## 🏆 Benefits

- Routing by area means the advice comes with the relevant conventions already loaded.
- Parallel dispatch keeps a multi-area review from becoming three sequential waits.
- Recording where each agent is defined turns a confusing "agent not found" into a one-line diagnosis.
- Keeping implementation in one place avoids two agents editing the same file from different assumptions.

## 👀 Examples

### ✅ Good: parallel dispatch for independent areas

```text
Launch in parallel, each with the session file path:
- backend-developer: review the proposed use case split
- frontend-developer: review the hook and service shape
- ui-ux-analyzer: review the payments table layout
```

### ❌ Bad: sequential dispatch for the same work

```text
Ask backend-developer. Wait. Then ask frontend-developer. Wait.
Then ask ui-ux-analyzer.
```

Three round trips for three reviews that never needed each other's output.

## 🧐 Real world examples

- [`.claude/agents/backend-developer.md`](../../.claude/agents/backend-developer.md)
- [`.claude/agents/frontend-developer.md`](../../.claude/agents/frontend-developer.md)
- [`.claude/agents/backend-test-engineer.md`](../../.claude/agents/backend-test-engineer.md)

## 🔗 Related agreements

- [`feature-workflow.md`](feature-workflow.md)
- [`../plans/how-to-create-a-plan.md`](../plans/how-to-create-a-plan.md)
