# 🎯 Git: commit messages

## 💡 Convention

```text
<emoji> <type>(<scope>): <description>

<body: why, not what>

Co-Authored-By: <tool> - <model> <version> (<effort>) <email>
```

The emoji encodes the **type**, not a mood. The same type always carries the same emoji.

| Emoji | Type | Use for |
|---|---|---|
| ✨ | `feat` | a new feature |
| 🐛 | `fix` | a bug fix |
| 📝 | `docs` | documentation only |
| ♻️ | `refactor` | behaviour-preserving change |
| ⚡️ | `perf` | performance |
| ✅ | `test` | adding or correcting tests |
| 🔧 | `chore` | anything not touching `src` or tests |
| 🚀 | `ci` | CI configuration |
| 🔖 | `chore` (release) | version bumps |

Rules:

- Description in English, imperative present tense, lowercase, no trailing period, at most 72 characters.
- Scope is the feature or area: `club-payments`, `sync`, `harness`, `mobile`.
- The body explains **why** the change was made. The diff already shows what changed.
- One decision per commit, so a revert removes one thing and nothing else.
- Prefer the specific type: `perf` over `refactor` for a speed change, `ci` over `chore` for a workflow change.

## 🏆 Benefits

- The type is readable at a glance in `git log --oneline`.
- Machine-readable prefixes let changelogs and release tooling filter by type.
- Reasoning stays attached to the code instead of being lost in a chat log.
- One decision per commit makes a revert safe rather than collateral.

## 👀 Examples

### ✅ Good: type, scope, and a body giving the reason

```text
🐛 fix(sync): treat insurance as a separate cycle from the annual license

The importer gated every payment on the "Fecha de envío" column, which
only applies to the annual license and cuota. Accident and RC insurance
form their own cycle, so gating them marked every member as paid.
```

### ❌ Bad: no type, past tense, no reason

```text
Fixed the import bug.
```

Unfilterable, uninformative, and it says nothing a reader could not get from the diff.

## 🧐 Real world examples

Run `git log --oneline -10` to see the convention in use. Recent commits following it:

```text
📝 docs(harness): replace monolithic CLAUDE.md with AGENTS.md and docs tree
🔖 chore(mobile): bump Android versionCode to 10
🐛 fix(sync): only mark members paid when Excel has "Fecha de envío"
✨ feat(club-payments): show member name instead of UUID in transactions list
```

## 🔗 Related agreements

- [`../plans/how-to-create-a-plan.md`](../plans/how-to-create-a-plan.md)
- [`../workflow/feature-workflow.md`](../workflow/feature-workflow.md)
