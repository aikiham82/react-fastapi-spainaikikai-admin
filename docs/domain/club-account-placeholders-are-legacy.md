# 🎯 Club account placeholders are legacy

## 💡 Convention

The MariaDB migration hung each old shared club login from a fake member, `"<Club> (Club Admin)"`, with no licence. By 2026-10-27 every one of those logins was passed to a real person or switched off with its club's deregistration, and the code that listed and passed them was removed. What remains:

- **Recognise a placeholder in one place.** `Member.is_club_account_placeholder` (and `is_club_account_placeholder_name` for raw input) is the only code that knows the `"(Club Admin)"` marker. The placeholders stay in the database, inactive.
- **The last name is reserved.** Creating a member or renaming one to `"(Club Admin)"` is refused for everyone, imports included; a renamed member would otherwise pass for a placeholder.
- **Placeholders never count as people.** Card activation and the "has own email" count leave them out.
- **The club record's email is legacy too.** It was the shared login's address; nothing signs in with it or sends to it, so the panel neither asks for nor shows it.
- **If a club login ever reappears** (an old import), relink it by hand: point `users.member_id` at the person, make that member club admin, kill the account's reset tokens, set the placeholder inactive, backing up the documents first.

## 🏆 Benefits

- 2026-10-26: a shidoin entering the card app with his club's shared login saw "Sin licencia vigente": the app showed the placeholder's missing licence. 39 clubs were in that state.
- Security QA found that a placeholder recognised by a name anyone could type let a club admin disguise a member with an account; reserving the name closes it.

## 👀 Examples

### ✅ Good: ask the entity

```python
holders = [m for m in members if not m.is_club_account_placeholder]
```

### ❌ Bad: compare the marker by hand

```python
holders = [m for m in members if m.last_name != "(Club Admin)"]  # misses " (Club Admin) "
```

## 🧐 Real world examples

- [`Member.is_club_account_placeholder`](../../backend/src/domain/entities/member.py)
- [`create_member_use_case.py`](../../backend/src/application/use_cases/member/create_member_use_case.py) and [`update_member_use_case.py`](../../backend/src/application/use_cases/member/update_member_use_case.py)
- [`request_card_access_use_case.py`](../../backend/src/application/use_cases/member_access/request_card_access_use_case.py)

## 🔗 Related agreements

- [The card is for every member, the panel for managers](the-card-is-for-every-member-the-panel-for-managers.md)
- [A club is switched off only by deregistration](a-club-is-switched-off-only-by-deregistration.md)
