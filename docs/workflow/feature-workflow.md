# 🎯 Feature workflow

## 💡 Convention

Every non-trivial feature moves through three phases, and its context lives in one file for the whole journey: `.claude/sessions/context_session_{feature_name}.md`.

### Phase 1 — Plan

- Create `.claude/sessions/context_session_{feature_name}.md` with the first analysis **before** any implementation.
- Consult the subagents relevant to the change, in parallel where possible. See [`subagents.md`](subagents.md).
- Write the agreed plan and the subagents' recommendations back into the session file.

### Phase 2 — Implement

- Read the session file before touching anything, so the full context is loaded.
- Keep it updated as work progresses: it should hold the plan, what has been done and what remains.
- Update it at the end of each milestone, not only at the very end.

### Phase 3 — Validate

- Hand the finished implementation to `qa-criteria-validator` for a feedback report.
- Iterate until the acceptance criteria pass.
- Review the report yourself and implement the feedback relating to the feature.

Subagents research and report; **the main agent does the implementation**. When delegating, always pass the session file path so the subagent starts with the same context.

## 🏆 Benefits

- The session file survives a context window, so a long feature does not have to be re-explained after a compaction or a new session.
- Consulting subagents before implementing surfaces architectural objections while they are still cheap to act on.
- A written acceptance step means "done" is demonstrated rather than asserted.
- Because context lives in a file rather than a conversation, a different agent or person can pick the work up.

## 👀 Examples

### ✅ Good: delegating with the context file

```text
Read .claude/sessions/context_session_club_payments.md for full context,
then review the proposed use case split and report back concerns.
```

The subagent starts with the history and returns advice that fits the work already done.

### ❌ Bad: delegating without it

```text
Review my payments code.
```

The subagent has no idea what was already decided, so it re-litigates settled choices and recommends things the plan already rejected.

## 🧐 Real world examples

- [`.claude/sessions/`](../../.claude/sessions): 34 session files from previous features.
- [`.claude/sessions/context_session_club_auth.md`](../../.claude/sessions/context_session_club_auth.md)
- [`.claude/sessions/context_session_member_payments.md`](../../.claude/sessions/context_session_member_payments.md)
- [`.agents/plans/`](../../.agents/plans): plans produced by the planning skill.

## 🔗 Related agreements

- [`subagents.md`](subagents.md)
- [`../plans/how-to-create-a-plan.md`](../plans/how-to-create-a-plan.md)
- [`../git/commit-messages.md`](../git/commit-messages.md)
