---
name: "2026_10_27-graphic_first"
description: "Bring back charm with a graphic-first interface: icons, belt badges, avatars, rings, bars and tick chips on every screen."
created_at: "2026-10-27T10:00:00Z"

created_by:
  tool: "Claude Code"
  model:
    name: "Claude Opus"
    version: "5.5"
    reasoning_effort: "low"
---

# Graphic-first interface

## 🎯 Goal

The ink-and-paper redesign was clean but lost its charm. Apply the graphic-first principles of the Sammy suite (state is shown, not read) to every screen, keeping the brush red as the single accent.

## 👀 Context

- User feedback (2026-10-27): "ha perdido encanto, antes con las badges se veía más chulo, se ha quedado mucho más soso. Todo debe ser graphic-first, con los mismos principios para interfaces que el proyecto de Sammy."
- Principles: `typescript-fullstack-sammy-suite/docs/design/graphic-first-design.md` (icon plus two or three words, numbers as ring, bar or badge, status shown not described, avatars for people, primary action biggest and warmest, 44px targets, one accent, soft radii, warm soft shadows, light tint instead of opacity).
- Mockup chosen by the user: [Graphic-first.dc.html](https://claude.ai/design/p/11725e09-0da3-4f43-a9ff-13539555008d?file=Graphic-first.dc.html), options 2a (side menu with icons and counters), 2c (mobile bottom tab bar), 2d/2e (members), 2f/2g (payments).
- Decisions: side menu with icons (2a), bottom tab bar on mobile (Inicio, Miembros, Pagos, Seminarios, Más), colour level as in the mockup.
- Domain touches: grades as belts (Dan black filled, Kyu white outlined, instructor title red tint); insurance as two small AC and RC tiles.
- No backend change. Counters in the menu reuse the dashboard query.

## 🪜 Phases

### Phase 1: Shared graphic components and shell

- [ ] `components/ui`: `Avatar` (initials, five tint pairs picked by name), `BeltBadge` (grade to Dan or Kyu look plus optional title), `StatusPill` (StatusBadge gains an icon per tone), `ProgressRing`, `ProgressBar`, `IconTile`, `TickChip` (selectable chip with check or plus and a price).
- [ ] Tokens: warm soft shadow, card radius 18px, control radius 12px.
- [ ] Sidebar with a lucide icon per item and red counters for expired licences and unpaid members; mobile bottom tab bar with Inicio, Miembros, Pagos, Seminarios and Más (opens the sheet).
- [ ] Tests for each new component and the tab bar.
- [ ] Verify the changes in terms of typechecking, linting and tests using the project's verification command. Fix issues if any.
- [ ] STOP. Present the changes to the user for review and suggest commit messages. Do NOT proceed to the next phase until the user explicitly asks.

### Phase 2: Inicio

- [ ] Greeting, three KPI cards (licences ring, insurance ring, season paid bar), attention cards with icon tile and avatar stack, next seminar card with date block and capacity bar, primary "Pagar temporada".
- [ ] Tests. Verify. STOP.

### Phase 3: Lists (members, licences, insurance, invoices, clubs, seminars)

- [ ] Avatars, belt badges, status pills with icons, AC and RC tiles, quick-filter chips with counters, seminar date blocks.
- [ ] Tests. Verify. STOP.

### Phase 4: Pagos and the remaining screens

- [ ] Payment checklist as tick chips with price, summary with an icon per concept and a large total; prices, settings, import and export and entry screens with icons where they carry meaning.
- [ ] Tests. Verify. STOP.

## ⏭️ Next step

Implement Phase 1.

Charm restored by 🐢 💨 (Turbotuga™, [Codely](https://codely.com)'s mascot).
