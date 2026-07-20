<script lang="ts">
  import { onMount, type Snippet } from "svelte";

  interface DropdownProps {
    trigger?: HTMLElement | "hover" | "click" | null;
    placement?: string;
    class?: string;
    open?: boolean;
    children?: Snippet;
  }

  let {
    trigger: triggerProp = $bindable(null),
    placement = "bottom",
    class: customClass = "",
    open = $bindable(false),
    children,
  }: DropdownProps = $props();

  let dropdownElement: HTMLDivElement | undefined;
  let triggerElement: HTMLElement | null = null;
  let floatingStyle = $state("");

  function show() {
    open = true;
  }

  function hide() {
    open = false;
  }

  function toggle() {
    open = !open;
  }

  function updateFloatingPosition() {
    if (!triggerElement) return;

    const triggerRect = triggerElement.getBoundingClientRect();
    const dropdownRect = dropdownElement?.getBoundingClientRect();
    const dropdownWidth = dropdownRect?.width || 160;
    const dropdownHeight = dropdownRect?.height || 0;
    const gap = 8;
    let top = triggerRect.bottom + gap;
    let left = triggerRect.left;

    switch (placement) {
      case "top":
        top = triggerRect.top - dropdownHeight - gap;
        left = triggerRect.left;
        break;
      case "left":
      case "left-start":
        top = triggerRect.top;
        left = triggerRect.left - dropdownWidth - gap;
        break;
      case "right":
      case "right-start":
        top = triggerRect.top;
        left = triggerRect.right + gap;
        break;
      case "bottom":
      default:
        top = triggerRect.bottom + gap;
        left = triggerRect.left;
        break;
    }

    const maxLeft = window.innerWidth - dropdownWidth - gap;
    const maxTop = window.innerHeight - dropdownHeight - gap;
    floatingStyle = `top: ${Math.max(gap, Math.min(top, maxTop))}px; left: ${Math.max(
      gap,
      Math.min(left, maxLeft)
    )}px;`;
  }

  onMount(() => {
    triggerElement =
      (typeof triggerProp === "string" ? null : triggerProp) ??
      ((dropdownElement?.previousElementSibling as HTMLElement | null) || null);

    if (!triggerElement) return;

    const mode = triggerProp === "hover" ? "hover" : "click";

    const onClick = () => toggle();
    const onEnter = () => show();
    const onLeave = () => hide();
    const onDocClick = (e: MouseEvent) => {
      if (
        open &&
        dropdownElement &&
        !dropdownElement.contains(e.target as Node) &&
        !triggerElement?.contains(e.target as Node)
      ) {
        hide();
      }
    };

    if (mode === "hover") {
      triggerElement.addEventListener("mouseenter", onEnter);
      triggerElement.addEventListener("mouseleave", onLeave);
      dropdownElement?.addEventListener("mouseenter", onEnter);
      dropdownElement?.addEventListener("mouseleave", onLeave);
    } else {
      triggerElement.addEventListener("click", onClick);
      document.addEventListener("click", onDocClick);
    }

    window.addEventListener("resize", updateFloatingPosition);
    document.addEventListener("scroll", updateFloatingPosition, true);

    return () => {
      triggerElement?.removeEventListener("click", onClick);
      triggerElement?.removeEventListener("mouseenter", onEnter);
      triggerElement?.removeEventListener("mouseleave", onLeave);
      dropdownElement?.removeEventListener("mouseenter", onEnter);
      dropdownElement?.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("resize", updateFloatingPosition);
      document.removeEventListener("scroll", updateFloatingPosition, true);
    };
  });

  $effect(() => {
    if (open) {
      updateFloatingPosition();
    }
  });
</script>

<div
  bind:this={dropdownElement}
  class="fixed z-[1100] min-w-40 rounded-box border border-base-300 bg-base-100 p-1 shadow-xl {open ? 'block' : 'hidden'} {customClass}"
  style={floatingStyle}
  role="menu"
>
  {#if children}
    {@render children()}
  {/if}
</div>
