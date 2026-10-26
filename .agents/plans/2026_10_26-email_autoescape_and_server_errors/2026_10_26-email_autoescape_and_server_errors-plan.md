---
name: "Email autoescape and server errors"
description: "Escape every value rendered into an email, and answer unexpected failures with a JSON 500 that carries CORS headers and no internal detail"
created_at: "2026-10-26T13:50:00Z"

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

last_implementation_at: "2026-10-26T14:20:00Z"
has_completed_all_phases: true
---

# Email autoescape and server errors

## Context

`OVHEmailService` renders its templates with a Jinja2 `Environment` that does not autoescape. Only the account invitation escapes its values by hand; the payment, licence, invoice and password reset emails insert member names as raw HTML. Two production members carry `&`, `<`, `>` or quotes in their names.

An unhandled exception reaches Starlette's `ServerErrorMiddleware`, which sits outside `CORSMiddleware`: the browser receives a plain-text 500 without CORS headers and the web reports it as a network error. Three routes also echo the internal exception text to the caller: user creation (500), licence image generation (500) and the public Redsys webhook, which also drops the error without logging it.

Real-data matrix: a member name with `&`, one with `<`/`>`, one with a quote, and a plain name, rendered through every template.

## Public contracts

- An unexpected failure answers `500 {"detail": "Error interno del servidor"}` with the usual CORS headers, and is logged with its traceback (Sentry captures it as an error event).
- `POST /api/v1/users` and the licence image route answer the same generic 500 detail.
- The Redsys webhook keeps answering 200 with `success: false`, with the message `"Error procesando la notificación"`.

## Phase 1: Escape every email value

- [x] Test: each template renders `Aikido & <b>Zen</b> "O'Brien"` escaped, and a plain name unchanged.
- [x] Test: a URL with `&` stays a working link (`&amp;` inside `href`).
- [x] Turn on `autoescape=True` in the email `Environment` and drop the manual `escape` calls.
- [x] STOP. Present the changes to the user and wait for approval.

## Phase 2: Generic JSON 500 with CORS

- [x] Test: an unhandled exception answers JSON 500 with `access-control-allow-origin` for an allowed origin, and is logged with `logger.exception`.
- [x] Test: user creation, licence image and Redsys webhook failures do not return the exception text.
- [x] Add an HTTP middleware inside CORS that turns unexpected exceptions into the generic 500.
- [x] Replace the three leaking messages; log the Redsys failure.
- [x] STOP. Present the changes to the user and wait for approval.
