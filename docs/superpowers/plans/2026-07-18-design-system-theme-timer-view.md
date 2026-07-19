# Design System Theme and Timer View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a portable semantic CubicDB theme layer and apply the first reusable design-system slice to the timer view.

**Architecture:** Theme data is JSON-serializable TypeScript and is applied through a CSS-variable bridge. Reusable Svelte components consume semantic CSS variables while preserving DaisyUI compatibility. Timer view adopts the Figma layout as a vertical slice.

**Tech Stack:** Svelte 5, TypeScript, Tailwind CSS 4, DaisyUI 5, lucide-svelte, Vitest.

## Global Constraints

- Do not run full builds.
- Avoid `svelte-check`.
- Use `lucide-svelte` icons only in app code.
- User-editable theme roles must be semantic names, not scale names like `green-500`.
- Keep this slice reversible and focused on timer design.

---

### Task 1: Semantic theme contract and CSS bridge

**Files:**
- Create: `src/lib/design/theme/AppTheme.ts`
- Create: `src/lib/design/theme/cubicdbTheme.ts`
- Create: `src/lib/design/theme/themeCssVariables.ts`
- Create: `src/lib/design/theme/themeCssVariables.test.ts`
- Modify: `src/lib/design/theme/index.ts`

**Interfaces:**
- Produces: `AppThemeDefinition`, `CUBICDB_THEME`, `createThemeCssVariables(theme)`, `createThemeCssText(theme)`.

- [ ] Write a failing test proving the theme serializes to JSON and emits semantic plus DaisyUI variables.
- [ ] Run `npx vitest run src/lib/design/theme/themeCssVariables.test.ts`.
- [ ] Implement the theme contract and CSS variable bridge.
- [ ] Re-run the focused Vitest command.
- [ ] Commit.

### Task 2: Theme CSS runtime utilities

**Files:**
- Modify: `src/themes/components.css`

**Interfaces:**
- Consumes: CSS variables emitted by Task 1.
- Produces: `.cdb-app-background`, `.cdb-panel`, `.cdb-panel-header`, `.cdb-icon-button`, `.cdb-segmented-tabs`, `.cdb-timer-display`.

- [ ] Write a source-level test for required class names.
- [ ] Run the focused test.
- [ ] Add utility classes backed by semantic CSS variables.
- [ ] Re-run the focused test.
- [ ] Commit.

### Task 3: Reusable design primitives

**Files:**
- Create: `src/lib/cubicdbKit/Panel.svelte`
- Create: `src/lib/cubicdbKit/IconButton.svelte`
- Create: `src/lib/cubicdbKit/SegmentedTabs.svelte`
- Modify: `src/lib/cubicdbKit/index.ts`
- Create: `src/lib/cubicdbKit/designPrimitives.test.ts`

**Interfaces:**
- Produces:
  - `Panel` with optional `title`, `actions`, `children`, `class`, `contentClass`.
  - `IconButton` with `icon`, `label`, `size`, `variant`, `onclick`.
  - `SegmentedTabs` with items and selected index callback.

- [ ] Write source-level tests for public props and semantic class usage.
- [ ] Run focused Vitest for the primitive tests.
- [ ] Implement minimal Svelte components.
- [ ] Re-run focused Vitest.
- [ ] Commit.

### Task 4: Timer view vertical slice

**Files:**
- Modify: `src/lib/timer/Timer.svelte`
- Modify: `src/lib/timer/TimerTab/TimerTab.svelte`

**Interfaces:**
- Consumes: `Panel`, `IconButton`, `SegmentedTabs`, and semantic CSS classes.
- Produces: Timer layout matching the inspected Figma desktop structure.

- [ ] Write source-level tests proving timer files consume design primitives and semantic layout classes.
- [ ] Run the focused tests.
- [ ] Replace timer tab/button/panel wrapper styling with design primitives.
- [ ] Keep timer logic untouched.
- [ ] Re-run focused tests and targeted ESLint.
- [ ] Commit.

### Task 5: Verification checkpoint

**Files:**
- Inspect changed files only.

- [ ] Run targeted Vitest for new tests.
- [ ] Run targeted ESLint for changed TS/Svelte files.
- [ ] Check `git diff --stat`.
- [ ] Report what changed, what to test manually, and the next design-system slice.
