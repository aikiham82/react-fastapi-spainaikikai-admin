# Roadmap: Spain Aikikai Admin — Seminar Images + Oficialidad

## Overview

Two surgical extensions to the existing seminar feature: club admins can upload a cover image for their seminars, and they can pay to make a seminar "official" (endorsed by Spain Aikikai) via the existing Redsys integration. The domain entity changes come first since both features share the same `Seminar` entity fields. Cover image is delivered end-to-end before the payment flow is built. A final polish phase adds the visual differentiators that make oficialidad worth paying for.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Seminar Cover Image** - Domain entity extension + full image upload flow (backend + frontend) (completed 2026-02-27)
- [ ] **Phase 2: Oficialidad Payment Flow** - Redsys payment to mark seminar official, badge display, idempotency guards
- [ ] **Phase 3: Polish** - Seal overlay on cover photo, price hint in card, upload progress indicator

## Phase Details

### Phase 1: Seminar Cover Image
**Goal**: Club admins can upload, replace, and remove a cover image for their seminars, and that image is visible in the card list and in the seminar detail
**Depends on**: Nothing (first phase)
**Requirements**: IMG-01, IMG-02, IMG-03, IMG-04, IMG-05, IMG-06, IMG-07
**Success Criteria** (what must be TRUE):
  1. Club admin can upload a JPEG, PNG, or WebP file from the seminar edit form and see a preview before saving
  2. The server rejects files that are not images (validated via magic bytes, not MIME header) and files larger than 5MB, with a clear error message shown to the user
  3. After upload, the saved image is resized to 800x450px (16:9) and served as a static URL accessible in the browser
  4. Club admin can remove the cover image from an existing seminar and the placeholder is shown in its place
  5. Seminars with a cover image show the image in the card list view and in the seminar detail dialog
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Backend: aiofiles install + Seminar entity extension + upload/delete use cases + API endpoints + StaticFiles mount
- [ ] 01-02-PLAN.md — Frontend data layer: Seminar interface + uploadCoverImage/deleteCoverImage service + mutations
- [ ] 01-03-PLAN.md — Frontend UI: CoverImageDropZone component + SeminarForm integration + SeminarList card/detail banners

### Phase 2: Oficialidad Payment Flow
**Goal**: Club admins can pay via Redsys to have their seminar endorsed by Spain Aikikai, and after confirmed payment the seminar is automatically marked official with no manual approval required
**Depends on**: Phase 1
**Requirements**: OFIC-01, OFIC-02, OFIC-03, OFIC-04, OFIC-05, OFIC-06, OFIC-07, OFIC-08, OFIC-09
**Success Criteria** (what must be TRUE):
  1. Super admin can set the oficialidad price from the Price Configurations panel and the new price takes effect immediately for the next payment initiation
  2. Club admin sees a "Solicitar Oficialidad" button on the detail of a non-official seminar belonging to their club, and the button is absent if the seminar is already official
  3. Clicking the button shows the configured price and redirects to Redsys; after successful Redsys payment, the seminar is automatically marked official without any Spain Aikikai manual step
  4. The Spain Aikikai badge appears in the seminar card list and in the seminar detail for official seminars
  5. Attempting to initiate a second oficialidad payment for an already-official seminar returns HTTP 409; a duplicate Redsys webhook for the same payment does not change state a second time
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Backend domain: Seminar.is_official + PaymentType.SEMINAR_OFICIALIDAD + PriceConfiguration "seminar" category + SeminarAlreadyOfficialError + DTO/mapper/repo propagation
- [x] 02-02-PLAN.md — Backend payment flow: InitiateSeminarOfficialidadUseCase + POST /seminars/{id}/oficialidad/initiate + webhook SEMINAR_OFICIALIDAD branch + DI wiring
- [ ] 02-03-PLAN.md — Frontend badge + price config: OfficialBadge component + SeminarList badge overlays + Seminar.is_official schema + PriceCategory "seminar" + PriceConfigurationForm update
- [ ] 02-04-PLAN.md — Frontend payment flow: SolicitudOficialidadModal + initiateSeminarOficialidad service/mutation + "Solicitar Oficialidad" button + post-payment return handling + polling

### Phase 3: Polish
**Goal**: Official seminars are visually distinctive and club admins have a better upload and payment discovery experience
**Depends on**: Phase 2
**Requirements**: (no additional v1 requirements — enhancements to criteria already met by Phase 1 and 2)
**Success Criteria** (what must be TRUE):
  1. On seminars where `is_official` is true AND a cover image exists, the Spain Aikikai seal is overlaid on the cover photo as a CSS position:absolute element (not just a badge below the image)
  2. The seminar card shows the oficialidad price (fetched from PriceConfiguration) before the club admin clicks "Solicitar Oficialidad", so they know the cost without entering the detail
  3. The file upload control in the seminar form shows a progress indicator during upload (not just a spinner after submit)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Seminar Cover Image | 3/3 | Complete   | 2026-02-27 |
| 2. Oficialidad Payment Flow | 3/4 | In Progress|  |
| 3. Polish | 0/TBD | Not started | - |
