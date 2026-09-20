# 🎯 Frontend conventions

## 💡 Convention

Rules that apply to every change under `frontend/src/`:

- **Each feature exports a context provider and a hook.** Use `use{Feature}Context` to reach state held in context, and `use{Feature}` for state and operations that do not need to be shared.
- **UI primitives come from `@/components/ui/`.** Do not hand-roll a button, dialog or table that already exists there.
- **Mutations return `{ action, isLoading, error, isSuccess }`.** Every mutation hook exposes the same four keys, whatever it does.
- **Services use axios** and live in the feature's `data/services/`. Components never call axios directly.
- **Types come from Zod schemas.** Infer the TypeScript type from the schema rather than declaring it twice.

## 🏆 Benefits

- A uniform mutation shape means a component consuming a new mutation needs no new wiring, and loading and error states are never forgotten.
- Keeping axios in services means a component test needs no network and no axios mock in the view layer.
- Inferring types from Zod keeps the runtime check and the compile-time type from drifting apart.
- Reusing `components/ui/` keeps the visual language consistent without a design review on every PR.

## 👀 Examples

### ✅ Good: a mutation hook with the agreed shape

```ts
export function useCreateMember() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: createMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membersKey }),
  })

  return {
    action: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  }
}
```

### ❌ Bad: a bespoke shape and a type declared twice

```ts
type Member = { id: string; name: string }        // drifts from the schema
export const memberSchema = z.object({ id: z.string(), name: z.string() })

export function useCreateMember() {
  const { mutate, isPending } = useMutation({ mutationFn: createMember })
  return { create: mutate, loading: isPending }   // different key names
}
```

Callers must learn a new vocabulary per hook, the error and success states are unavailable, and `Member` can silently diverge from `memberSchema`.

## 🧐 Real world examples

- [`frontend/src/features/members/hooks/`](../../frontend/src/features/members/hooks)
- [`frontend/src/features/club-payments/hooks/mutations/`](../../frontend/src/features/club-payments/hooks/mutations)
- [`frontend/src/features/members/data/services/`](../../frontend/src/features/members/data/services)
- [`frontend/src/features/members/data/schemas/`](../../frontend/src/features/members/data/schemas)
- [`frontend/src/components/ui/`](../../frontend/src/components/ui)

## 🔗 Related agreements

- [`../architecture/frontend-features.md`](../architecture/frontend-features.md)
- [`../testing/testing-strategy.md`](../testing/testing-strategy.md)
