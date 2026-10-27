# 🎯 UI visual language: graphic first, one brush red

## 💡 Convention

Every admin screen is **graphic first**: what a director needs to read is shown as a picture before it is written as a sentence. Icon plus two or three words, numbers as a ring, bar or badge, people as an avatar, state as an icon pill. The palette comes from the federation logo: paper background, ink text and the brush red of the logo frame as the **only** accent.

- **Use the shared pieces** in [`graphic.tsx`](../../frontend/src/components/ui/graphic.tsx) and [`status-badge.tsx`](../../frontend/src/components/ui/status-badge.tsx): `Avatar` and `AvatarStack` for people, `BeltBadge` for grades (Dan black, Kyu white, title red tint), `ProgressRing` and `ProgressBar` for "x of y", `IconTile` for an item that needs attention, `TickChip` for a selectable concept with its price, `StateTile` for a small 30px mark (AC/RC, paid licence) whose state needs its corner icon, `StatusBadge` (icon plus word) for state.
- **Show, do not describe.** "3 caducadas" is a counter on the Club icon and a red chip, not a paragraph. A capacity is a bar, a coverage is a ring.
- **Tokens, not colours.** `bg-card`, `text-muted-foreground`, `bg-primary`, the status tokens `success`, `warning`, `danger` with their `-soft` tints. Never `bg-blue-50`, `text-gray-600` or a hex value. Use a soft tint, never opacity, for a muted state.
- **Shape.** Cards `rounded-[18px] shadow-card` (the warm shadow in `index.css`), controls 12px, touch targets at least 44px. No gradients, no emoji, no filler copy.
- **Status never relies on colour alone.** The word or the icon is always there, even on a 30px tile: `StateTile` adds the tone icon in its corner. Not paid yet is `neutral` (dashed circle, like the "Pendiente" pill); the red cross is for missing, expired or cancelled.
- **Text.** Spanish with accents, sentence case, no developer keys, no em-dashes.
- **Design before code.** A new screen or a visual change is drawn in Claude Design first, on the shared data sheet, and the code follows the mockup.

## 🏆 Benefits

- A non-technical director scans a screen in a second: red counter, empty ring, amber chip.
- The app keeps its charm. The previous "ink and paper" version, without icons or badges, was rejected by the user as bland.
- Red keeps one meaning: "do this" or "needs you".

## 👀 Examples

### ✅ Good: coverage as a ring

```tsx
<ProgressRing value={stats.licensed_members} max={stats.active_members} label="Licencias al día" />
```

### ❌ Bad: coverage as a sentence

```tsx
<p>18 de 24 miembros tienen la licencia al día.</p>
```

### ✅ Good: a grade as a belt

```tsx
<BeltBadge grade={member.grade} title={member.instructor_category} />
```

### ❌ Bad: a grade as plain text in a column

```tsx
<td>{member.grade}</td>
```

## 🧐 Real world examples

- [`frontend/src/components/ui/graphic.tsx`](../../frontend/src/components/ui/graphic.tsx)
- [`frontend/src/features/dashboard/components/Dashboard.tsx`](../../frontend/src/features/dashboard/components/Dashboard.tsx)
- [`frontend/src/features/annual-payments/components/PaymentChecklist.tsx`](../../frontend/src/features/annual-payments/components/PaymentChecklist.tsx)
- Mockups: Claude Design project "Spain Aikikai admin - rediseño", file `Graphic-first.dc.html`, linked from [`.agents/plans/2026_10_27-graphic_first/2026_10_27-graphic_first-plan.md`](../../.agents/plans/2026_10_27-graphic_first/2026_10_27-graphic_first-plan.md).

## 🔗 Related agreements

- [`navigation-groups-and-tabs.md`](navigation-groups-and-tabs.md)
- [`list-screens-share-one-pattern.md`](list-screens-share-one-pattern.md)
- [`dates-and-money-use-core-formatters.md`](dates-and-money-use-core-formatters.md)
