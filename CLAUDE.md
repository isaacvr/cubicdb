# CubicDB - Claude Code Instructions

## Project

CubicDB is a speedcubing desktop app (timer, simulator, algorithms, tutorials).
Built with SvelteKit 5 + Electron + XState 5 + TypeScript.

## Commands

```bash
pnpm dev          # SvelteKit dev + Electron
pnpm web          # SvelteKit dev only (web)
pnpm build        # Web build
pnpm check        # Type check
pnpm lint:oxc     # Lint
pnpm test:unit    # Vitest
```

## Architecture

Read `docs/architecture/README.md` for the full index. Key points:

- **Timer** is a reactor, not a state machine. Devices control the flow.
- **Devices** use XState internally, emit events via EventBus.
- **EventBus** carries domain events. High-frequency time updates use direct callbacks.
- **Svelte 5 runes** (`$state`, `$derived`, `$effect`) — not writable stores.
- **Settings** are per-session only. No global settings.
- **Each app section** is independent. Few cross-section events.

## Conventions

Read `docs/development/conventions.md` for full details. Summary:

- **Files**: PascalCase for everything.
- **Interfaces/Types**: `I` prefix (`IEventBus`, `ISolveRepository`).
- **Use cases**: `*UseCase` suffix (`CreateSolveUseCase`).
- **Handlers**: `on*Handler` (`onClickHandler`).
- **Constants**: `UPPER_SNAKE_CASE`. Routes in `ROUTES.*`, never hardcoded.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`).
- **Branches**: `feature/`, `fix/`, `refactor/`, `docs/`, `chore/`.
- **Errors**: `Result<T, E>` for expected errors, exceptions for bugs.
- **i18n**: All UI text via `$localLang.section.key`, never hardcoded.
- **Language**: All documentation, comments, and commits must be in English.

## Key Paths

```
src/lib/core/          # Domain: entities, ports (I*Repository), use cases (*UseCase)
src/lib/events/        # EventBus, domain events, handlers
src/lib/timer/         # Timer reactor, state, UI components
src/lib/devices/       # Device implementations (target, migration in progress)
src/lib/timer/adaptors/  # Current device implementations (legacy, being migrated)
src/lib/services/      # Services (ScrambleService, etc.)
src/lib/adapters/      # Repository implementations (IndexedDB, etc.)
src/lib/helpers/       # Pure utility functions
src/lib/lang/          # i18n (EN, ES, ZH)
src/lib/constants/     # App constants, routes
docs/architecture/     # Architecture docs (timer, devices, events, etc.)
docs/development/      # Dev conventions, git, testing, error handling
```

## What NOT to Do

- Don't use `writable()` / `readable()` stores. Use `$state`.
- Don't hardcode routes or UI text strings.
- Don't make devices modify Timer state directly. Emit events.
- Don't put business logic in Svelte components. Use use cases or the reactor.
- Don't mock EventBus in integration tests.
- Don't add global settings. Settings are per-session.
- Don't write documentation, comments, or commits in any language other than English.
