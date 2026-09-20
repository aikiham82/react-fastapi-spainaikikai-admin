# 🎯 Available skills

## 💡 Convention

Skills live in [`.claude/skills/`](../../.claude/skills), one directory each, and are invoked by name. Read a skill's `SKILL.md` when its area matches the task; do not load them all.

| Skill | Use when |
|---|---|
| `brainstorming` | Before any creative work: a new feature, component or behaviour change. Explores intent and requirements before implementation. |
| `systematic-debugging` | Any bug, test failure or unexpected behaviour, **before** proposing a fix. Includes root-cause tracing and flaky-test guidance. |
| `frontend-design` | Building or styling production UI, pages and components. |
| `web-design-guidelines` | Reviewing existing UI against the Web Interface Guidelines. |
| `accessibility` | WCAG 2.2 audits, screen reader support, keyboard navigation. |
| `webapp-testing` | Driving the running app with Playwright to verify behaviour or capture screenshots. |
| `vercel-react-best-practices` | Writing, reviewing or refactoring React for performance: re-renders, bundles, async patterns. |
| `seo` | Search visibility, meta tags, structured data, sitemaps. |

This list is maintained by hand. The `autoskills` tool previously generated an equivalent summary directly into `CLAUDE.md`; that block was removed when the harness was split, so that a regeneration cannot overwrite hand-written instructions.

## 🏆 Benefits

- One table names every skill and the trigger for it, so the right one is reachable without opening eight files.
- Keeping the list out of `AGENTS.md` means a generator cannot clobber the project's own rules.
- Naming the trigger rather than the description makes it obvious when a skill does *not* apply.

## 👀 Examples

### ✅ Good: load the one skill that matches

```text
Test failing intermittently → read .claude/skills/systematic-debugging/SKILL.md
```

### ❌ Bad: inline every skill's summary into the entry point

Every agent then pays for all eight on every turn, and a regeneration silently rewrites the file that also holds the non-negotiables.

## 🧐 Real world examples

- [`.claude/skills/systematic-debugging/SKILL.md`](../../.claude/skills/systematic-debugging/SKILL.md)
- [`.claude/skills/brainstorming/SKILL.md`](../../.claude/skills/brainstorming/SKILL.md)
- [`.claude/skills/webapp-testing/SKILL.md`](../../.claude/skills/webapp-testing/SKILL.md)

## 🔗 Related agreements

- [`development-commands.md`](development-commands.md)
- [`../workflow/feature-workflow.md`](../workflow/feature-workflow.md)
