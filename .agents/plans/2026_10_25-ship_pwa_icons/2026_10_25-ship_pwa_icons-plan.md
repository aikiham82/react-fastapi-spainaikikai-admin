---
name: "Ship the PWA icons"
description: "Make the admin web installable: track the PWA icons that .gitignore swallowed and serve the manifest with its MIME type"
created_at: "2026-10-25T19:30:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Ship the PWA icons

## Context

Production serves `manifest.webmanifest` but `icon-192.png`, `icon-512.png` and `apple-touch-icon.png` answer 404: the root `.gitignore` ignores every `*.png`, so the icons never reached git. nginx also serves the manifest as `application/octet-stream`.

This change does not depend on club data.

## Phase 1: Track the icons and serve the manifest type

- [x] Add `!frontend/public/*.png` to `.gitignore` and commit the three icons.
- [x] Serve `manifest.webmanifest` as `application/manifest+json` in `frontend/nginx.conf`.
- [x] Check installability with Chromium (`Page.getInstallabilityErrors`) against a local build.
- [x] STOP. Present the changes to the user for review.

## Next step

All phases done.

Icons shipped thanks to [Codely](https://codely.com) 🐢 📱
