# Design System Theme and Timer View Design

## Goal

Implement the first CubicDB design-system vertical slice from the Figma UI kit: a portable semantic theme layer, reusable base UI styles/components, and the timer view layout/colors/styles based on the desktop timer design.

## Figma references

- File: `MDdUdXPhXCSSHKGL2rzBkT`
- Foundations: `4:17`
- Components: `4:16`
- Views: `0:1`
- Timer desktop target frames inspected: `1249:17243` and `5218:10057`

## Requirements

- Icons in app code use `lucide-svelte`.
- Theme customization must use semantic role names, not editable color scale names like `green-500`.
- Theme data must be JSON-serializable or trivially portable to JSON.
- Runtime styling should continue to work with DaisyUI, while exposing CubicDB-specific semantic CSS variables for richer component styling.
- The first implementation slice should be reversible and focused on the timer view.
- Do not run full builds.
- Avoid `svelte-check`.

## Architecture

The theme layer has two parts:

1. A portable TypeScript theme definition that can be serialized to JSON.
2. A CSS-variable bridge that applies that definition to the DOM and maps semantic roles into DaisyUI variables.

Components consume semantic CSS variables first, and DaisyUI variables second where existing classes already depend on them. This allows the app to keep using DaisyUI-compatible controls while gradually moving toward CubicDB-owned design tokens.

## Semantic theme contract

The user-facing theme contract exposes roles:

- `base`, `baseSoft`, `baseRaised`
- `baseContent`, `baseContentMuted`, `baseContentSubtle`
- `primary`, `primaryContent`, `primarySoft`, `primaryDisabled`
- `secondary`, `secondaryContent`
- `accent`, `accentContent`
- `info`, `infoContent`
- `success`, `successContent`
- `warning`, `warningContent`
- `error`, `errorContent`
- `borderSubtle`, `borderVisible`, `borderFocus`
- `overlay`

It also exposes role-based structure:

- `shape`: `control`, `panel`, `modal`, `pill`
- `space`: `xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `panel`
- `shadow`: `panel`, `modal`, `control`
- `typography`: `appFont`, `timerFont`, `monoFont`
- `background`: gradient/glow configuration

Scale-like names may exist internally inside Figma or implementation helper constants, but user-authored themes should target roles.

## Base UI slice

The first reusable slice includes:

- `Panel`: standard panel surface with Figma-like border, radius, padding, overflow policy, and optional title/actions.
- `IconButton`: square control for lucide icons.
- `SegmentedTabs`: timer tabs styled like the Figma tab group.
- global theme utility classes for background and timer typography.

Existing components may keep using `Button`, `Modal`, `Tooltip`, and DaisyUI classes. The first slice should not attempt to replace every component in the app.

## Timer view target

The timer view should adopt:

- compact page gap/padding around `7px`/`8px`;
- a top controls row around `40px`;
- body grid with left flexible column and right rail around `264px`;
- left column containing scramble panel and counter panel;
- right rail containing preview and statistics panels;
- panel radius around `12px`;
- soft blue/teal panel surfaces over a dark background;
- mono scramble text;
- large timer display with muted milliseconds;
- icon buttons and tabs using lucide icons.

Mobile/narrow layouts may collapse the right rail below the main column.

## Testing

Use focused tests:

- theme definition is JSON-serializable;
- CSS variable bridge emits DaisyUI-compatible and CubicDB semantic variables;
- base component source contracts expose required variants/classes;
- timer view source uses the new design primitives.

Verification should use targeted Vitest and targeted ESLint only. No build and no `svelte-check`.
