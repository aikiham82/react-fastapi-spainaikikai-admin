---
name: "accent_insensitive_member_search"
description: "Member and licence searches match every typed word against first or last name, ignoring accents and case"
created_at: "2026-10-29T09:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"

implemented_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
last_implementation_at: "2026-10-29T09:30:00Z"
has_completed_all_phases: true
---

# Accent-insensitive member search

## Goal

Typing "lucia fernandez" in the members or licences list must find "Lucía Fernández Soto". Every typed word must appear in the first or last name, ignoring accents and case.

## Context

- Reported by the federation admin on 2026-10-28: a first name and unaccented surname returned nothing in Club > Miembros and Club > Licencias, though the member exists and is active.
- Root cause: both searches match the whole term against one field at a time and are accent-sensitive.
  - [`mongodb_member_repository.py`](../../../backend/src/infrastructure/adapters/repositories/mongodb_member_repository.py) `search_by_name`, used by `GET /members?search=` and `GET /members/search`.
  - [`licenses.py`](../../../backend/src/infrastructure/web/routers/licenses.py) `get_licenses`, which builds the same `$or` inline.
- The frontend already sends the term to the server in both lists; no frontend change.
- Conventions: [`docs/security/search-terms-are-escaped-and-bounded.md`](../../../docs/security/search-terms-are-escaped-and-bounded.md) (escape, `max_length=100`), [`docs/architecture/backend-hexagonal.md`](../../../docs/architecture/backend-hexagonal.md).
- Real data matrix (production, read-only, 1278 members): 357 names all in capitals, 167 compound first names; accented letters present: í á ó é ú ñ, their capitals, and À/à. Each is a test case below.

## Phases

### Phase 1: word-by-word, accent-insensitive name search

Add `name_search_filter(term: str) -> dict` that folds the term, splits it into words and requires each word (with every vowel/n/c expanded to its accented variants) in `first_name` or `last_name`. Use it in both searches.

- [x] Create `backend/src/infrastructure/adapters/repositories/name_search.py` with `name_search_filter(term: str) -> dict`.
- [x] Tests in `backend/tests/infrastructure/adapters/repositories/test_name_search.py`:
  - [x] words in any order match first and last name
  - [x] lowercase unaccented term matches capitalised accented name
  - [x] accented term matches unaccented name
  - [x] `n` matches `ñ`/`Ñ`
  - [x] `a` matches `À`/`à`
  - [x] regex characters are matched literally
  - [x] a blank term filters nothing out
- [x] `MongoDBMemberRepository.search_by_name` uses the helper; update `test_search_by_name_escapes_regex_characters`.
- [x] `get_licenses` uses the helper; add `test_licence_search_by_first_and_last_name_ignores_accents` to `backend/tests/api/test_licenses_search.py`.
- [x] Update `docs/security/search-terms-are-escaped-and-bounded.md` to point at the helper.
- [x] Verify the changes in terms of typechecking, linting and tests using the project's verification command (look it up in the AGENTS.md file or the project configuration). Fix issues if any.
- [x] STOP. Present the changes to the user for review and suggest commit messages (or pull request titles, when the phases are implemented through pull requests). Do NOT proceed to the next phase until the user explicitly asks.

## Next step

All phases implemented; review and merge the branch.

Search that finds everyone, accents and all, brought to you by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
