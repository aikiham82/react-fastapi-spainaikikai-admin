# 🎯 Documentation guidelines

## 💡 Convention

Write **one document per convention**, stored in the `docs/` folder that matches its domain, and follow a fixed template so every document is predictable:

```markdown
# 🎯 Name of the convention

## 💡 Convention
What the rule is, stated in one or two sentences.

## 🏆 Benefits
- Why the rule exists.

## 👀 Examples
### ✅ Good: specific case
[code]

### ❌ Bad: specific case
[code]

## 🧐 Real world examples
- Links to files in this repository that follow the convention.

## 🔗 Related agreements
- Links to related documents.
```

A document describes **one** agreement. If a file needs the word "and" to describe what it covers, split it.

## 🏆 Benefits

- An agent loads the single convention its task needs instead of the whole knowledge base, which keeps context small and relevant.
- A new contributor finds conventions by browsing folders rather than scrolling one long file.
- Each convention is independently reviewable in a pull request, so a change to one rule is visible instead of buried in a diff touching everything.
- The fixed template means the reader always knows where the rule, the rationale and the counter-example live.

## 👀 Examples

### ✅ Good: one file per agreement, in a domain folder

```
docs/
├── architecture/
│   ├── backend-hexagonal.md
│   └── frontend-features.md
└── testing/
    └── testing-strategy.md
```

Each file answers one question. An agent implementing a use case reads `backend-hexagonal.md` and nothing else.

### ❌ Bad: one monolithic file

```
CLAUDE.md   # 319 lines: overview, commands, architecture, conventions,
            # testing, security, workflow rules, subagent routing
```

Every agent pays for every section on every turn, a change to the testing rule produces a diff in the same file as the architecture rule, and nobody can tell which parts are still true.

## 🧐 Real world examples

- [`architecture/backend-hexagonal.md`](architecture/backend-hexagonal.md)
- [`architecture/frontend-features.md`](architecture/frontend-features.md)
- [`testing/testing-strategy.md`](testing/testing-strategy.md)
- [`dev-tooling/development-commands.md`](dev-tooling/development-commands.md)

## 🔗 Related agreements

- [`../AGENTS.md`](../AGENTS.md): the entry point that maps every document in this folder.
