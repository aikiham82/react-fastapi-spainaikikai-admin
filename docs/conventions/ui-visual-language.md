# 🎯 UI visual language: ink, paper and one brush red

## 💡 Convention

Every admin screen uses the palette taken from the federation logo: paper background, ink text and the brush red of the logo frame, which is reserved for the **one** main action of a screen and the active menu item. Status is shown with `StatusBadge` (a dot plus a word), never with the brand red.

- **Tokens, not colours.** Use `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary` and the status tokens `success`, `warning`, `danger` (with their `-soft` backgrounds) from [`index.css`](../../frontend/src/index.css). Never `bg-blue-50`, `text-gray-600` or a hex value.
- **Status.** `<StatusBadge tone="ok|warn|bad|neutral">Palabra</StatusBadge>`: green al día or activa, amber caduca pronto or falta algo, red caducada or impagada, neutral pendiente or sin datos. The word is always present, so colour is never the only signal.
- **Structure.** Group with spacing and `border-b border-border` hairlines. No shadows on cards, no cards inside cards, no gradients, no icon in a coloured circle, no emoji, no filler copy.
- **Text.** Spanish with accents, sentence case ("Nueva licencia", not "Nueva Licencia"), no developer keys on screen and no em-dashes.
- **Type and shape.** One typeface (Geist, self-hosted), one radius scale, buttons and rows at least 44px on touch screens.

## 🏆 Benefits

- A non-technical club director learns one screen and can read every other one.
- Red keeps its meaning: "do this" on a button, "something is wrong" only inside a status badge.
- The app looks like the federation's tool, not like a generic AI-generated template.

## 👀 Examples

### ✅ Good: status as a word with a colour

```tsx
<StatusBadge tone={expired ? 'bad' : 'ok'}>{expired ? 'Caducada' : 'Activa'}</StatusBadge>
```

### ❌ Bad: status painted with the brand red

```tsx
<Badge variant="default">Activa</Badge>
```

The default badge is the brush red, so "Activa" reads like an error next to "Eliminar".

### ✅ Good: a section grouped by a hairline

```tsx
<section className="flex flex-col gap-3 border-b border-border py-6">
```

### ❌ Bad: a shadowed card with a coloured icon header

```tsx
<Card className="shadow-lg">
  <div className="rounded-full bg-purple-100 p-2"><Settings className="text-purple-600" /></div>
```

## 🧐 Real world examples

- [`frontend/src/index.css`](../../frontend/src/index.css): palette, status tokens and motion variables.
- [`frontend/src/components/ui/status-badge.tsx`](../../frontend/src/components/ui/status-badge.tsx)
- [`frontend/src/features/dashboard/components/Dashboard.tsx`](../../frontend/src/features/dashboard/components/Dashboard.tsx)
- Mockups: the Claude Design project "Spain Aikikai admin - rediseño", linked from [`.agents/plans/2026_10_26-ux_qa_redesign/2026_10_26-ux_qa_redesign-plan.md`](../../.agents/plans/2026_10_26-ux_qa_redesign/2026_10_26-ux_qa_redesign-plan.md).

## 🔗 Related agreements

- [`list-screens-share-one-pattern.md`](list-screens-share-one-pattern.md)
- [`dates-and-money-use-core-formatters.md`](dates-and-money-use-core-formatters.md)
- [`frontend.md`](frontend.md)
