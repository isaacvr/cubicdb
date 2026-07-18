# Modal Layout Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fullscreen and limited-width layout variants to the shared modal component.

**Architecture:** Keep one shared `Modal.svelte` component. The component owns dialog shell, optional top bar, variant sizing, and backdrop behavior; callers select layout through props rather than raw Tailwind geometry.

**Tech Stack:** Svelte 5, DaisyUI modal classes, Tailwind utility classes, Vitest source-level contract tests.

## Global Constraints

- Do not build.
- Do not run `svelte-check`.
- Preserve backwards compatibility for existing `Modal` callers.
- Use targeted Vitest and ESLint verification only.

---

### Task 1: Modal layout variants

**Files:**
- Modify: `src/lib/components/ModalBehavior.test.ts`
- Modify: `src/lib/components/Modal.svelte`
- Modify: `src/lib/timer/TimerTab/TimerTab.svelte`

**Interfaces:**
- Consumes: existing `Modal` props `show`, `cancel`, `closeOnClickOutside`, `closeOnEscape`, `transitionName`, `class`, `onclose`, `children`.
- Produces: new `Modal` props `variant?: "limited" | "fullscreen"`, `size?: "sm" | "md" | "lg" | "xl" | "2xl"`, `title?: string`, `showCloseButton?: boolean`.

- [ ] **Step 1: Write failing modal behavior assertions**

Update `src/lib/components/ModalBehavior.test.ts` to require the new API strings, conditional top-bar markup, and timer preview usage of `variant="fullscreen"` with `showCloseButton`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/lib/components/ModalBehavior.test.ts`

Expected: FAIL because the new modal API and top-bar structure do not exist yet.

- [ ] **Step 3: Implement modal API and layout**

In `src/lib/components/Modal.svelte`, add the new props and render:

- a native `<dialog>` shell
- a `.modal-box` whose classes depend on `variant` and `size`
- a conditional top bar when `title` or close button is present
- a scrollable body area for children

- [ ] **Step 4: Update timer preview caller**

In `src/lib/timer/TimerTab/TimerTab.svelte`, replace raw fullscreen geometry classes with `variant="fullscreen"` and `showCloseButton`.

- [ ] **Step 5: Run focused verification**

Run:

```powershell
npm run test:unit -- src/lib/components/ModalBehavior.test.ts
npx eslint src/lib/components/Modal.svelte src/lib/timer/TimerTab/TimerTab.svelte src/lib/components/ModalBehavior.test.ts
```

Expected: both commands exit `0`.

- [ ] **Step 6: Commit**

Run:

```powershell
git add docs/superpowers/specs/2026-07-18-modal-layout-variants-design.md docs/superpowers/plans/2026-07-18-modal-layout-variants.md src/lib/components/ModalBehavior.test.ts src/lib/components/Modal.svelte src/lib/timer/TimerTab/TimerTab.svelte
git -c commit.gpgsign=false commit -m "feat: add modal layout variants"
```
