---
name: "Redact member emails from logs"
description: "Stop member email addresses from reaching Sentry through application logs"
created_at: "2026-09-30T14:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Redact member emails from logs

## 🎯 Goal

Member email addresses reach Sentry: ERROR logs become events and INFO logs become breadcrumbs attached to every later event. Remove the addresses from the log calls that carry them, and redact any address that still reaches Sentry.

## 👀 Context

- [`backend/src/config/sentry.py`](../../../backend/src/config/sentry.py): `sentry_sdk.init` with default integrations and `send_default_pii=False`, which does not scrub log message text. No `before_send` or `before_breadcrumb`.
- [`backend/src/infrastructure/adapters/services/email_service.py`](../../../backend/src/infrastructure/adapters/services/email_service.py): INFO log with `message.to` on success; ERROR log with `str(e)`, which for `smtplib.SMTPRecipientsRefused` is the dict of refused addresses.
- [`backend/src/application/use_cases/notification/send_license_expiration_notifications_use_case.py`](../../../backend/src/application/use_cases/notification/send_license_expiration_notifications_use_case.py): INFO log with `member.email`.
- [`backend/src/application/use_cases/password_reset/request_password_reset_use_case.py`](../../../backend/src/application/use_cases/password_reset/request_password_reset_use_case.py): ERROR log with the raw exception from the email service.
- Out of scope: Logfire `scrubbing=False` in `backend/src/config/logfire.py` (separate decision).
- Docs: [`docs/security/security-guidelines.md`](../../../docs/security/security-guidelines.md), [`docs/testing/no-production-data.md`](../../../docs/testing/no-production-data.md), [`docs/testing/testing-strategy.md`](../../../docs/testing/testing-strategy.md).

## 🪜 Phases

### Phase 1: Log calls carry no personal data

The log calls that carried addresses log counts, ids and exception types instead.

Public contracts:

- Log messages:
  - `email_service.py` success: `Email sent via OVH SMTP to N recipient(s)`.
  - `email_service.py` failure: `Failed to send email: <ExceptionType>`.
  - licence expiration use case: `Sent N-day expiration notice to member <member id> for license <license id>`.
  - password reset use case: `Error sending password reset email: <ExceptionType>`.
- Test suites:
  - `tests/infrastructure/adapters/services/test_email_service_logging.py`: success log has no address; `SMTPRecipientsRefused` log has no address.
  - `tests/application/use_cases/notification/test_send_license_expiration_notifications_use_case.py`: the sent notice log has no address.
  - `tests/application/use_cases/password_reset/test_request_password_reset_use_case.py`: a failing email service is logged by exception type only.

To-do:

- [ ] Write the test cases above and see them fail.
- [ ] Change the four log calls.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`cd backend && poetry run pytest`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: Sentry redacts email addresses

Any address still present in an event or breadcrumb is replaced with `[email]` before it leaves the process.

Public contracts:

- `src/config/sentry.py`: `_redact_emails(text)`, `before_send(event, hint)`, `before_breadcrumb(crumb, hint)`, passed to `sentry_sdk.init`.
- Test suite `tests/infrastructure/test_sentry_config.py`:
  - `before_send` redacts addresses in the message, the log entry and exception values
  - `before_breadcrumb` redacts addresses in the breadcrumb message
  - text without addresses is unchanged
  - `sentry_sdk.init` receives both hooks

To-do:

- [ ] Write the test cases above and see them fail.
- [ ] Implement the hooks and pass them to `sentry_sdk.init`.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command (`cd backend && poetry run pytest`). Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

## ⏭️ Next step

Implement Phase 1.

Privacy guarded by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot)
