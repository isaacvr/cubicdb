# Modal Layout Variants Design

## Goal

Standardize the shared application modal so it supports both fullscreen workflows and limited-width dialogs without callers fighting the component with ad-hoc positioning classes.

## Requirements

- Fullscreen modals keep the current blurred backdrop and fit the screen.
- Fullscreen modal content reserves a top section only when a title or close button exists.
- Limited-width modals keep the same blurred backdrop and grow only up to an explicit size.
- Clicking outside the content may close the modal only when `closeOnClickOutside` is enabled. The default is `false`.
- Clicking inside modal content must not close the modal.
- If there is no title and no close button, the modal must not reserve top-bar space.
- The close button belongs in the top bar area, not floating over the body content.

## API

`Modal.svelte` keeps backwards compatibility with the existing `show`, `cancel`, `closeOnClickOutside`, `closeOnEscape`, `class`, `transitionName`, and `onclose` props.

New props:

- `variant?: "limited" | "fullscreen"` defaults to `"limited"`.
- `size?: "sm" | "md" | "lg" | "xl" | "2xl"` defaults to `"lg"` and applies only to limited modals.
- `title?: string` renders the top-bar title.
- `showCloseButton?: boolean` explicitly controls the top-bar close button.

The legacy `cancel` prop remains supported as a close-button permission flag. If `showCloseButton` is omitted, the close button appears only when the modal has a title and `cancel` is true. Existing callers with `cancel={false}` still hide the default close button.

## Layout

The modal shell remains a native `<dialog>` with DaisyUI `modal` styles so it appears above the app and keeps backdrop behavior.

Inside the shell:

1. `.modal-box` owns the modal dimensions.
2. A top bar renders only when `title` or the close button is visible.
3. The body fills the remaining space and scrolls if its content exceeds available height.

Default close behavior:

- `closeOnClickOutside = false`.
- `closeOnEscape = true`.
- `showCloseButton` defaults to `true` only for titled modals.
- `showCloseButton={false}` is allowed when a caller intentionally uses outside click, explicit action buttons, or a content-only modal.
- Clicking inside modal content never closes the modal.

Fullscreen variant:

- Width: `calc(100vw - 1rem)`.
- Height: `calc(100svh - 1rem)`.
- No max-width or max-height cap.

Limited variant:

- Width: `100%`.
- Max height: `calc(100svh - 1rem)`.
- Max width comes from `size`.

## Timer Preview

The timer cube preview uses:

```svelte
<Modal bind:show={prevExpanded} variant="fullscreen" showCloseButton>
  <PuzzleImageBundle ... />
</Modal>
```

This gives the preview a fullscreen body and keeps the close button in the reserved top bar.

## Testing

Extend `src/lib/components/ModalBehavior.test.ts` to assert:

- The shared modal defines `variant`, `size`, `title`, and `showCloseButton`.
- The shared modal has a conditional top bar.
- The close button lives in the top bar, not as a fixed viewport overlay.
- The timer preview uses `variant="fullscreen"` with `showCloseButton`.
- History comments are still normalized before binding.
