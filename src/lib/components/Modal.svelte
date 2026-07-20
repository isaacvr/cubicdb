<script lang="ts">
  import Button from "$lib/cubicdbKit/Button.svelte";
  import { XIcon } from "lucide-svelte";
  import { twMerge } from "tailwind-merge";

  type ModalVariant = "limited" | "fullscreen";
  type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";

  interface ModalProps {
    show?: boolean;
    cancel?: boolean;
    closeOnClickOutside?: boolean;
    closeOnEscape?: boolean;
    transitionName?: string;
    variant?: "limited" | "fullscreen";
    size?: "sm" | "md" | "lg" | "xl" | "2xl";
    title?: string;
    showCloseButton?: boolean;
    class?: string;
    onclose?: (...data: any[]) => any;
    children?: () => any;
  }

  const LIMITED_SIZE_CLASSES: Record<ModalSize, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  let {
    show = $bindable(false),
    cancel = $bindable(true),
    closeOnClickOutside = $bindable(false),
    closeOnEscape = $bindable(true),
    variant = "limited",
    size = "lg",
    title = "",
    showCloseButton,
    class: _cl = $bindable(""),
    transitionName = $bindable("none"),
    onclose = () => {},
    children = () => {},
  }: ModalProps = $props();

  let modal: HTMLDialogElement;
  let shouldShowCloseButton = $derived(showCloseButton ?? (cancel && Boolean(title)));
  let hasHeader = $derived(Boolean(title) || shouldShowCloseButton);
  let activeTransitionName = $derived(show ? transitionName : "none");

  function modalBoxClass(variant: ModalVariant, size: ModalSize, customClass: string) {
    return twMerge(
      "modal-box relative p-0 overflow-hidden flex flex-col max-w-[calc(100vw-1rem)] max-h-[calc(100svh-1rem)]",
      variant === "fullscreen"
        ? "w-[calc(100vw-1rem)] h-[calc(100svh-1rem)] max-w-none max-h-none"
        : `w-full ${LIMITED_SIZE_CLASSES[size]}`,
      customClass || "",
      "cdb-modal-surface"
    );
  }

  function modalBodyClass(variant: ModalVariant) {
    return twMerge("min-h-0 flex-1 overflow-auto", variant === "fullscreen" ? "p-0" : "p-6");
  }

  function keyUpHandler(e: KeyboardEvent) {
    if (!show) return;
    e.stopPropagation();
  }

  function keyDownHandler(e: KeyboardEvent) {
    if (!show) return;

    if (e.target === e.currentTarget) {
      e.stopPropagation();
    }

    if (e.code === "Escape") {
      if (closeOnEscape) {
        close(null);
      } else {
        e.preventDefault();
      }
    }
  }

  function getModalContentRect() {
    return modal.firstElementChild?.getBoundingClientRect();
  }

  function handleClick(ev: MouseEvent) {
    if (!modal) return;
    if (ev.target != ev.currentTarget) return;
    if (!closeOnClickOutside) return;

    const contentRect = getModalContentRect();
    if (!contentRect) return;

    const clickedOutsideContent =
      ev.clientX < contentRect.left ||
      ev.clientX > contentRect.right ||
      ev.clientY < contentRect.top ||
      ev.clientY > contentRect.bottom;

    if (clickedOutsideContent) {
      close(null);
    }
  }

  let isCallbackCalled = false;

  function close(data: any = null) {
    onclose && onclose(data || null);
    show = false;
    isCallbackCalled = true;
  }

  function closeFromButton() {
    close(null);
  }

  $effect(() => {
    if (show) {
      isCallbackCalled = false;
      modal?.showModal();
    } else {
      modal?.close();
      if (!isCallbackCalled) {
        close(null);
        isCallbackCalled = true;
      }
    }
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={modal}
  data-type="modal"
  role="alertdialog"
  onmousedown={handleClick}
  onkeyup={keyUpHandler}
  onkeydown={keyDownHandler}
  oncancel={e => !cancel && e.preventDefault()}
  class="modal z-[1000] mx-auto text-sm rounded-md p-2 overflow-visible"
  style="view-transition-name: none;"
>
  <div class={modalBoxClass(variant, size, _cl)} style="view-transition-name: {activeTransitionName};">
    {#if hasHeader}
      <header class="flex shrink-0 items-center gap-4 border-b border-base-content/10 px-6 py-3">
        {#if title}
          <h2 class="min-w-0 flex-1 truncate text-base font-bold">{title}</h2>
        {:else}
          <div class="flex-1"></div>
        {/if}

        {#if shouldShowCloseButton}
          <Button type="tertiary" size="sm" icon tabindex="0" onclick={closeFromButton}>
            <XIcon size="1rem" />
          </Button>
        {/if}
      </header>
    {/if}

    {#if show}
      <div class={modalBodyClass(variant)}>
        {@render children?.()}
      </div>
    {/if}
  </div>
</dialog>

<style lang="postcss">
  @reference "@src/themes/index.css";

  @keyframes fadeIn {
    from {
      background-color: #0000;
      backdrop-filter: blur(0);
    }

    to {
      background-color: #0003;
      backdrop-filter: blur(0.5rem);
    }
  }

  dialog::backdrop {
    animation: fadeIn 200ms linear 0ms forwards;
    background-color: #0003;
    backdrop-filter: blur(0.5rem);
  }

  dialog[data-type="modal"][open] {
    animation: fadeIn 200ms linear 0ms forwards;
    background-color: #0003;
    backdrop-filter: blur(0.5rem);
  }

  .cdb-modal-surface {
    background-color: var(--color-base-200);
    color: var(--color-base-content);
    border: 0.0625rem solid color-mix(in oklab, var(--color-base-content) 10%, transparent);
    border-radius: var(--radius-box);
    box-shadow: var(--cdb-shadow-modal);
    backdrop-filter: none;
  }
</style>
