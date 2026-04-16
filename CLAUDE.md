# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack backoffice application with a FastAPI backend implementing hexagonal architecture and a React TypeScript frontend. The project manages clubs, members, payments,seminars and licenses.

### Tech Stack
- **Backend**: FastAPI, Motor (MongoDB), OAuth2, Pydantic
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Radix UI, React Query, React Router
- **Database**: MongoDB (with Docker setup available)
- **Architecture**: Hexagonal Architecture (Ports & Adapters) for backend, Feature-based architecture for frontend

## Common Commands

### Backend (from `/backend` directory)
```bash
# Install Poetry (if not already installed)
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
poetry install

# Activate virtual environment
poetry shell

# Run development server
poetry run uvicorn src.main:app --reload

# Run tests with coverage
poetry run pytest --cov=src --cov-report=term-missing --cov-report=html

# Run specific test types
poetry run pytest -m unit          # Unit tests only
poetry run pytest -m integration   # Integration tests only
poetry run pytest -m "not slow"  # Skip slow tests

# Run specific test file
poetry run pytest tests/test_domain_entities.py

# Run tests matching pattern
poetry run pytest -k "test_user"

# Add a new dependency
poetry add package-name

# Add a development dependency
poetry add --group dev package-name

# Update dependencies
poetry update

# Show installed packages
poetry show

# Export to requirements.txt (if needed for compatibility)
poetry export -f requirements.txt --output requirements.txt
```

### Frontend (from `/frontend` directory)
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Database
```bash
# Start MongoDB with Docker
docker compose up -d
```

## Architecture

### Backend - Hexagonal Architecture

The backend follows hexagonal architecture with clear separation of concerns:

#### Domain Layer (`src/domain/`)
- **Entities** (`entities/`): Core business objects using `@dataclass` with validation in `__post_init__`
- **Exceptions** (`exceptions/`): Domain-specific exceptions for business rule violations

#### Application Layer (`src/application/`)
- **Ports** (`ports/`): Repository interfaces (abstract contracts)
- **Use Cases** (`use_cases/`): Business logic orchestration, one public `execute` method per use case

#### Infrastructure Layer (`src/infrastructure/`)
- **Adapters** (`adapters/repositories/`): MongoDB repository implementations
- **Web** (`web/`): FastAPI routers, DTOs, mappers, dependencies
  - **Routers**: Thin controllers delegating to use cases
  - **DTOs**: Pydantic models for request/response validation
  - **Mappers**: Clean conversion between DTOs and domain entities
  - **Dependencies**: Dependency injection with `@lru_cache()` for repositories

### Frontend - Feature-based Architecture

The frontend is organized by features with each feature containing:

#### Feature Structure (`src/features/{feature}/`)
- **Components** (`components/`): React components using feature context
- **Data** (`data/`): Schemas (Zod), services (API calls)
- **Hooks** (`hooks/`):
  - **Context Hook** (`use{Feature}Context.tsx`): Feature state management and operations using context
  - **Business Hook** (`use{Feature}.tsx`): Feature state management and operations 
  - **Mutations** (`mutations/`): React Query mutations for data modification
  - **Queries** (`queries/`): React Query queries for data fetching

#### Core Infrastructure (`src/core/`)
- **Data** (`data/`): API client, app storage, query client setup
- **Hooks** (`hooks/`): Shared hooks across features

#### UI Components (`src/components/ui/`)
- Radix UI-based reusable components with TailwindCSS styling

## Development Guidelines

### Backend Conventions
- Use dependency injection throughout the web layer
- All use cases follow the pattern: constructor injection → single `execute` method
- Domain entities validate in `__post_init__` and business methods
- Repository implementations use MongoDB with Motor async driver
- DTOs use Pydantic with comprehensive validation
- Map domain exceptions to appropriate HTTP status codes

### Frontend Conventions
- Each feature exports a context provider and custom hook
- Components import UI components from `@/components/ui/`
- Use `use{Feature}Context` for accessing feature state and operations for context states
- Use `use{Feature}` for accessing feature state and operations
- Mutations return: `{action, isLoading, error, isSuccess}`
- Services use axios for API communication
- Type safety with TypeScript and Zod schemas

### Testing
- Backend uses pytest with comprehensive test configuration
- Tests organized by layers: domain, service, repository, API, integration
- Coverage requirement: 80%
- Use markers for test categorization: `unit`, `integration`, `slow`, `auth`, `api`

### Security
- OAuth2 authentication with JWT tokens
- Password hashing with bcrypt
- Protected routes on both backend and frontend
- Environment-based configuration for sensitive data

## Environment Setup


## Important Files
- `backend/src/app.py`: FastAPI application factory
- `backend/src/main.py`: Application entry point
- `frontend/src/main.tsx`: React application entry point
- `backend/pytest.ini`: Test configuration
- `backend/run_tests.py`: Comprehensive test runner with multiple options


## WORKFLOW RULES
### Phase 1
- At the starting point of a feature on plan mode phase you MUST ALWAYS init a `.claude/sessions/context_session_{feature_name}.md` with yor first analisis
- You MUST ask to the subagents that you considered that have to be involved about the implementation and check their opinions, try always to run them on parallel if is posible
- After a plan mode phase you ALWAYS update the `.claude/sessions/context_session_{feature_name}.md` with the definition of the plan and the recommendations of the subagents
### Phase 2
- Before you do any work, MUST view files in `.claude/sessions/context_session_{feature_name}.md` file to get the full context (x being the id of the session we are operate)
- `.claude/sessions/context_session_{feature_name}.md` should contain most context of what we did, overall plan, and sub agents will continuously add context to the file
- After you finish each phase, MUST update the `.claude/sessions/context_session_{feature_name}.md` file to make sure others can get full context of what you did
- After you finish the work, MUST update the `.claude/sessions/context_session_{feature_name}.md` file to make sure others can get full context of what you did
### Phase 3
- After finish the final implementation MUST use qa-criteria-validator subagent to provide a report feedback an iterate over this feedback until acceptance criteria are passed
- After qa-criteria-validator finish, you MUST review their report and implement the feedback related with the feature

### SUBAGENTS MANAGEMENT
You have access to 8 subagents:
- shadcn-ui-architect: all task related to UI building & tweaking HAVE TO consult this agent
- qa-criteria-validator: all final client UI/UX implementations has to be validated by this subagent to provide feedback an iterate.
- ui-ux-analyzer: all the task related with UI review, improvements & tweaking HAVE TO consult this agent
- frontend-developer: all task related to business logic in the client side before create the UI building & tweaking HAVE TO consult this agent
- frontend-test-engineer: all task related to business logic in the client side after implementation has to consult this agent to get the necessary test cases definitions
- backend-developer: all task related to business logic in the backend side HAVE TO consult this agent
- backend-test-engineer: all task related to business logic in the backend side after implementation has to consult this agent to get the necessary test cases definitions

Subagents will do research about the implementation and report feedback, but you will do the actual implementation;

When passing task to sub agent, make sure you pass the context file, e.g. `.claude/sessions/context_session_{feature_name}.md`.

After each sub agent finish the work, make sure you read the related documentation they created to get full context of the plan before you start executing

<!-- autoskills:start -->

Summary generated by `autoskills`. Check the full files inside `.claude/skills`.

## Accessibility (a11y)

Audit and improve web accessibility following WCAG 2.2 guidelines. Use when asked to "improve accessibility", "a11y audit", "WCAG compliance", "screen reader support", "keyboard navigation", or "make accessible".

- `.claude/skills/accessibility/SKILL.md`
- `.claude/skills/accessibility/references/A11Y-PATTERNS.md`: Practical, copy-paste-ready patterns for common accessibility requirements. Each pattern is self-contained and linked from the main [SKILL.md](../SKILL.md).
- `.claude/skills/accessibility/references/WCAG.md`

## Brainstorming Ideas Into Designs

You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.

- `.claude/skills/brainstorming/SKILL.md`

## Design Thinking

Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beaut...

- `.claude/skills/frontend-design/SKILL.md`

## SEO optimization

Optimize for search engine visibility and ranking. Use when asked to "improve SEO", "optimize for search", "fix meta tags", "add structured data", "sitemap optimization", or "search engine optimization".

- `.claude/skills/seo/SKILL.md`

## Systematic Debugging

Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes

- `.claude/skills/systematic-debugging/SKILL.md`
- `.claude/skills/systematic-debugging/condition-based-waiting.md`: Flaky tests often guess at timing with arbitrary delays. This creates race conditions where tests pass on fast machines but fail under load or in CI.
- `.claude/skills/systematic-debugging/CREATION-LOG.md`: Reference example of extracting, structuring, and bulletproofing a critical skill.
- `.claude/skills/systematic-debugging/defense-in-depth.md`: When you fix a bug caused by invalid data, adding validation at one place feels sufficient. But that single check can be bypassed by different code paths, refactoring, or mocks.
- `.claude/skills/systematic-debugging/root-cause-tracing.md`: Bugs often manifest deep in the call stack (git init in wrong directory, file created in wrong location, database opened with wrong path). Your instinct is to fix where the error appears, but that's treating a symptom.
- `.claude/skills/systematic-debugging/test-academic.md`: You have access to the systematic debugging skill at skills/debugging/systematic-debugging
- `.claude/skills/systematic-debugging/test-pressure-1.md`: **IMPORTANT: This is a real scenario. You must choose and act. Don't ask hypothetical questions - make the actual decision.**
- `.claude/skills/systematic-debugging/test-pressure-2.md`: **IMPORTANT: This is a real scenario. You must choose and act. Don't ask hypothetical questions - make the actual decision.**
- `.claude/skills/systematic-debugging/test-pressure-3.md`: **IMPORTANT: This is a real scenario. You must choose and act. Don't ask hypothetical questions - make the actual decision.**

## Vercel React Best Practices

React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimizati...

- `.claude/skills/vercel-react-best-practices/SKILL.md`
- `.claude/skills/vercel-react-best-practices/AGENTS.md`: **Version 1.0.0** Vercel Engineering January 2026
- `.claude/skills/vercel-react-best-practices/rules/advanced-event-handler-refs.md`: Store callbacks in refs when used in effects that shouldn't re-subscribe on callback changes.
- `.claude/skills/vercel-react-best-practices/rules/advanced-init-once.md`: Do not put app-wide initialization that must run once per app load inside `useEffect([])` of a component. Components can remount and effects will re-run. Use a module-level guard or top-level init in the entry module instead.
- `.claude/skills/vercel-react-best-practices/rules/advanced-use-latest.md`: Access latest values in callbacks without adding them to dependency arrays. Prevents effect re-runs while avoiding stale closures.
- `.claude/skills/vercel-react-best-practices/rules/async-api-routes.md`: In API routes and Server Actions, start independent operations immediately, even if you don't await them yet.
- `.claude/skills/vercel-react-best-practices/rules/async-defer-await.md`: Move `await` operations into the branches where they're actually used to avoid blocking code paths that don't need them.
- `.claude/skills/vercel-react-best-practices/rules/async-dependencies.md`: For operations with partial dependencies, use `better-all` to maximize parallelism. It automatically starts each task at the earliest possible moment.
- `.claude/skills/vercel-react-best-practices/rules/async-parallel.md`: When async operations have no interdependencies, execute them concurrently using `Promise.all()`.
- `.claude/skills/vercel-react-best-practices/rules/async-suspense-boundaries.md`: Instead of awaiting data in async components before returning JSX, use Suspense boundaries to show the wrapper UI faster while data loads.
- `.claude/skills/vercel-react-best-practices/rules/bundle-barrel-imports.md`: Import directly from source files instead of barrel files to avoid loading thousands of unused modules. **Barrel files** are entry points that re-export multiple modules (e.g., `index.js` that does `export * from './module'`).
- `.claude/skills/vercel-react-best-practices/rules/bundle-conditional.md`: Load large data or modules only when a feature is activated.
- `.claude/skills/vercel-react-best-practices/rules/bundle-defer-third-party.md`: Analytics, logging, and error tracking don't block user interaction. Load them after hydration.
- `.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md`: Use `next/dynamic` to lazy-load large components not needed on initial render.
- `.claude/skills/vercel-react-best-practices/rules/bundle-preload.md`: Preload heavy bundles before they're needed to reduce perceived latency.
- `.claude/skills/vercel-react-best-practices/rules/client-event-listeners.md`: Use `useSWRSubscription()` to share global event listeners across component instances.
- `.claude/skills/vercel-react-best-practices/rules/client-localstorage-schema.md`: Add version prefix to keys and store only needed fields. Prevents schema conflicts and accidental storage of sensitive data.
- `.claude/skills/vercel-react-best-practices/rules/client-passive-event-listeners.md`: Add `{ passive: true }` to touch and wheel event listeners to enable immediate scrolling. Browsers normally wait for listeners to finish to check if `preventDefault()` is called, causing scroll delay.
- `.claude/skills/vercel-react-best-practices/rules/client-swr-dedup.md`: SWR enables request deduplication, caching, and revalidation across component instances.
- `.claude/skills/vercel-react-best-practices/rules/js-batch-dom-css.md`: Avoid interleaving style writes with layout reads. When you read a layout property (like `offsetWidth`, `getBoundingClientRect()`, or `getComputedStyle()`) between style changes, the browser is forced to trigger a synchronous reflow.
- `.claude/skills/vercel-react-best-practices/rules/js-cache-function-results.md`: Use a module-level Map to cache function results when the same function is called repeatedly with the same inputs during render.
- `.claude/skills/vercel-react-best-practices/rules/js-cache-property-access.md`: Cache object property lookups in hot paths.
- `.claude/skills/vercel-react-best-practices/rules/js-cache-storage.md`: **Incorrect (reads storage on every call):**
- `.claude/skills/vercel-react-best-practices/rules/js-combine-iterations.md`: Multiple `.filter()` or `.map()` calls iterate the array multiple times. Combine into one loop.
- `.claude/skills/vercel-react-best-practices/rules/js-early-exit.md`: Return early when result is determined to skip unnecessary processing.
- `.claude/skills/vercel-react-best-practices/rules/js-hoist-regexp.md`: Don't create RegExp inside render. Hoist to module scope or memoize with `useMemo()`.
- `.claude/skills/vercel-react-best-practices/rules/js-index-maps.md`: Multiple `.find()` calls by the same key should use a Map.
- `.claude/skills/vercel-react-best-practices/rules/js-length-check-first.md`: When comparing arrays with expensive operations (sorting, deep equality, serialization), check lengths first. If lengths differ, the arrays cannot be equal.
- `.claude/skills/vercel-react-best-practices/rules/js-min-max-loop.md`: Finding the smallest or largest element only requires a single pass through the array. Sorting is wasteful and slower.
- `.claude/skills/vercel-react-best-practices/rules/js-set-map-lookups.md`: Convert arrays to Set/Map for repeated membership checks.
- `.claude/skills/vercel-react-best-practices/rules/js-tosorted-immutable.md`: **Incorrect (mutates original array):**
- `.claude/skills/vercel-react-best-practices/rules/rendering-activity.md`: Use React's `<Activity>` to preserve state/DOM for expensive components that frequently toggle visibility.
- `.claude/skills/vercel-react-best-practices/rules/rendering-animate-svg-wrapper.md`: Many browsers don't have hardware acceleration for CSS3 animations on SVG elements. Wrap SVG in a `<div>` and animate the wrapper instead.
- `.claude/skills/vercel-react-best-practices/rules/rendering-conditional-render.md`: Use explicit ternary operators (`? :`) instead of `&&` for conditional rendering when the condition can be `0`, `NaN`, or other falsy values that render.
- `.claude/skills/vercel-react-best-practices/rules/rendering-content-visibility.md`: Apply `content-visibility: auto` to defer off-screen rendering.
- `.claude/skills/vercel-react-best-practices/rules/rendering-hoist-jsx.md`: Extract static JSX outside components to avoid re-creation.
- `.claude/skills/vercel-react-best-practices/rules/rendering-hydration-no-flicker.md`: When rendering content that depends on client-side storage (localStorage, cookies), avoid both SSR breakage and post-hydration flickering by injecting a synchronous script that updates the DOM before React hydrates.
- `.claude/skills/vercel-react-best-practices/rules/rendering-hydration-suppress-warning.md`: In SSR frameworks (e.g., Next.js), some values are intentionally different on server vs client (random IDs, dates, locale/timezone formatting). For these *expected* mismatches, wrap the dynamic text in an element with `suppressHydrationWarning` to prevent noisy warnings. Do not use this to hide r...
- `.claude/skills/vercel-react-best-practices/rules/rendering-svg-precision.md`: Reduce SVG coordinate precision to decrease file size. The optimal precision depends on the viewBox size, but in general reducing precision should be considered.
- `.claude/skills/vercel-react-best-practices/rules/rendering-usetransition-loading.md`: Use `useTransition` instead of manual `useState` for loading states. This provides built-in `isPending` state and automatically manages transitions.
- `.claude/skills/vercel-react-best-practices/rules/rerender-defer-reads.md`: Don't subscribe to dynamic state (searchParams, localStorage) if you only read it inside callbacks.
- `.claude/skills/vercel-react-best-practices/rules/rerender-dependencies.md`: Specify primitive dependencies instead of objects to minimize effect re-runs.
- `.claude/skills/vercel-react-best-practices/rules/rerender-derived-state-no-effect.md`: If a value can be computed from current props/state, do not store it in state or update it in an effect. Derive it during render to avoid extra renders and state drift. Do not set state in effects solely in response to prop changes; prefer derived values or keyed resets instead.
- `.claude/skills/vercel-react-best-practices/rules/rerender-derived-state.md`: Subscribe to derived boolean state instead of continuous values to reduce re-render frequency.
- `.claude/skills/vercel-react-best-practices/rules/rerender-functional-setstate.md`: When updating state based on the current state value, use the functional update form of setState instead of directly referencing the state variable. This prevents stale closures, eliminates unnecessary dependencies, and creates stable callback references.
- `.claude/skills/vercel-react-best-practices/rules/rerender-lazy-state-init.md`: Pass a function to `useState` for expensive initial values. Without the function form, the initializer runs on every render even though the value is only used once.
- `.claude/skills/vercel-react-best-practices/rules/rerender-memo-with-default-value.md`: When memoized component has a default value for some non-primitive optional parameter, such as an array, function, or object, calling the component without that parameter results in broken memoization. This is because new value instances are created on every rerender, and they do not pass strict...
- `.claude/skills/vercel-react-best-practices/rules/rerender-memo.md`: Extract expensive work into memoized components to enable early returns before computation.
- `.claude/skills/vercel-react-best-practices/rules/rerender-move-effect-to-event.md`: If a side effect is triggered by a specific user action (submit, click, drag), run it in that event handler. Do not model the action as state + effect; it makes effects re-run on unrelated changes and can duplicate the action.
- `.claude/skills/vercel-react-best-practices/rules/rerender-simple-expression-in-memo.md`: When an expression is simple (few logical or arithmetical operators) and has a primitive result type (boolean, number, string), do not wrap it in `useMemo`. Calling `useMemo` and comparing hook dependencies may consume more resources than the expression itself.
- `.claude/skills/vercel-react-best-practices/rules/rerender-transitions.md`: Mark frequent, non-urgent state updates as transitions to maintain UI responsiveness.
- `.claude/skills/vercel-react-best-practices/rules/rerender-use-ref-transient-values.md`: When a value changes frequently and you don't want a re-render on every update (e.g., mouse trackers, intervals, transient flags), store it in `useRef` instead of `useState`. Keep component state for UI; use refs for temporary DOM-adjacent values. Updating a ref does not trigger a re-render.
- `.claude/skills/vercel-react-best-practices/rules/server-after-nonblocking.md`: Use Next.js's `after()` to schedule work that should execute after a response is sent. This prevents logging, analytics, and other side effects from blocking the response.
- `.claude/skills/vercel-react-best-practices/rules/server-auth-actions.md`: **Impact: CRITICAL (prevents unauthorized access to server mutations)**
- `.claude/skills/vercel-react-best-practices/rules/server-cache-lru.md`: **Implementation:**
- `.claude/skills/vercel-react-best-practices/rules/server-cache-react.md`: Use `React.cache()` for server-side request deduplication. Authentication and database queries benefit most.
- `.claude/skills/vercel-react-best-practices/rules/server-dedup-props.md`: **Impact: LOW (reduces network payload by avoiding duplicate serialization)**
- `.claude/skills/vercel-react-best-practices/rules/server-parallel-fetching.md`: React Server Components execute sequentially within a tree. Restructure with composition to parallelize data fetching.
- `.claude/skills/vercel-react-best-practices/rules/server-serialization.md`: The React Server/Client boundary serializes all object properties into strings and embeds them in the HTML response and subsequent RSC requests. This serialized data directly impacts page weight and load time, so **size matters a lot**. Only pass fields that the client actually uses.

## Web Interface Guidelines

Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".

- `.claude/skills/web-design-guidelines/SKILL.md`

## Web Application Testing

Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.

- `.claude/skills/webapp-testing/SKILL.md`

<!-- autoskills:end -->
