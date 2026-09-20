# 🎯 Frontend: feature-based architecture

## 💡 Convention

The frontend is organised by feature, not by technical type. Everything one feature needs lives under `frontend/src/features/{feature}/`:

```
features/{feature}/
├── components/          React components consuming the feature's hooks
├── data/
│   ├── schemas/         Zod schemas: the boundary between API and app
│   └── services/        axios calls, one function per endpoint
└── hooks/
    ├── use{Feature}Context.tsx   state and operations shared via context
    ├── use{Feature}.tsx          state and operations for local use
    ├── queries/                  React Query reads
    └── mutations/                React Query writes
```

Anything shared by more than one feature moves out:

- `src/core/data/`: the axios client, app storage and the React Query client.
- `src/core/hooks/`: hooks shared across features.
- `src/components/ui/`: Radix-based primitives styled with TailwindCSS.

A feature may import from `core/` and `components/ui/`. A feature must not import from another feature's internals; promote the shared piece to `core/` instead.

## 🏆 Benefits

- Deleting a feature is deleting a folder.
- The blast radius of a change is visible from the path alone.
- Data fetching stays out of components, so a component can be rendered in a test without a network.
- Zod schemas make the API boundary explicit, so a backend shape change fails loudly at the edge instead of silently rendering `undefined`.

## 👀 Examples

### ✅ Good: a component consuming a feature hook

```tsx
export function MembersList() {
  const { members, isLoading } = useMembersContext()

  if (isLoading) return <Skeleton />
  return <DataTable rows={members} />
}
```

The component renders. It does not know the endpoint, the cache key or the axios instance.

### ❌ Bad: a component fetching for itself

```tsx
export function MembersList() {
  const [members, setMembers] = useState([])
  useEffect(() => {
    axios.get('/api/members').then(r => setMembers(r.data))
  }, [])
  return <DataTable rows={members} />
}
```

The URL is hardcoded in the view, there is no cache, no error state, no loading state, and no schema validating what came back.

## 🧐 Real world examples

- [`frontend/src/features/members/`](../../frontend/src/features/members)
- [`frontend/src/features/club-payments/`](../../frontend/src/features/club-payments)
- [`frontend/src/core/data/apiClient.ts`](../../frontend/src/core/data/apiClient.ts)
- [`frontend/src/core/data/queryClient.ts`](../../frontend/src/core/data/queryClient.ts)
- [`frontend/src/core/hooks/usePermissions.ts`](../../frontend/src/core/hooks/usePermissions.ts)

## 🔗 Related agreements

- [`project-layout.md`](project-layout.md)
- [`../testing/testing-strategy.md`](../testing/testing-strategy.md)
