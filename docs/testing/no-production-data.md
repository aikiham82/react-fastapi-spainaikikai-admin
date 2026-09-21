# 🎯 No production data in the repository

## 💡 Convention

Test fixtures, plans, commit messages and API documentation use **invented** people, clubs and addresses. Real members' names and email addresses stay in the database.

Use `example.com` for addresses and a descriptive placeholder for names (`NOMBRE REPETIDO`, `OLD CLUB`). When a production case is what a test exists for, describe the shape in the docstring instead of copying the row: "the two people in production holding two accounts each" says everything the reader needs without naming them.

## 🏆 Benefits

- Personal addresses in a repository are published the moment it is pushed, and a commit cannot be unpublished by editing a file. Removing them later means rewriting history, which every clone then has to be told about.
- The federation holds this data to run licences and insurance. A repository is not one of the purposes it was given for.
- A test that names a real member breaks when that member leaves, is renamed or is merged, for reasons that have nothing to do with the behaviour under test.
- Invented data reads as data. `director@example.com` tells the reader "this value is arbitrary", where a real address invites the next person to reuse it somewhere that sends mail.

## 👀 Examples

### ✅ Good: the shape of the production case, none of the people

```python
async def test_execute_issues_one_link_per_account_sharing_a_user_name(self, ...):
    """Test the two people in production holding two accounts each."""
    mock_find_login_accounts.execute.return_value = [
        User(id="a", email="personal@example.com", username="NOMBRE REPETIDO", hashed_password="h"),
        User(id="b", email="club@example.com", username="NOMBRE REPETIDO", hashed_password="h"),
    ]
```

The docstring carries why the case matters; the fixture carries nothing that identifies anyone.

### ❌ Bad: the production row, copied

```python
mock_find_login_accounts.execute.return_value = [
    User(id="a", email="alerivrod@gmail.com", username="ALEJANDRO RIVERO RODRIGUEZ", hashed_password="h"),
    User(id="b", email="info@heijoshin.com", username="ALEJANDRO RIVERO RODRIGUEZ", hashed_password="h"),
]
```

Two real people, three real addresses, pushed to GitHub with the test.

### ❌ Bad: a real club in the API documentation

```python
identifier: str = Field(
    ...,
    description="Email or user name of the account, for example KUKI AIKIKAI"
)
```

This renders in the public OpenAPI schema. The field needs no example to be understood.

### ✅ Exception: an investigation quotes what it found

A plan or an incident note may name the account it is about when that is the subject: "Kuki Aikikai signs in with an address that is neither the club's nor the member's". Keep it to the one fact the reader needs, prefer the club over the person, and never paste a list of rows. Everything a plan needs beyond that is a count: "four accounts hold an unusable address".

## 🧐 Real world examples

- [`backend/tests/application/use_cases/password_reset/test_request_password_reset_use_case.py`](../../backend/tests/application/use_cases/password_reset/test_request_password_reset_use_case.py)
- [`backend/tests/infrastructure/web/test_login_with_username_router.py`](../../backend/tests/infrastructure/web/test_login_with_username_router.py)
- [`backend/tests/infrastructure/web/test_own_email_router.py`](../../backend/tests/infrastructure/web/test_own_email_router.py)

## 🔗 Related agreements

- [`testing-strategy.md`](testing-strategy.md): how these suites are organised.
- [`../security/security-guidelines.md`](../security/security-guidelines.md): the rule that nothing sensitive is committed.
- [`../git/commit-messages.md`](../git/commit-messages.md): commit bodies explain the why, which never requires naming a member.

Kept anonymous by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
