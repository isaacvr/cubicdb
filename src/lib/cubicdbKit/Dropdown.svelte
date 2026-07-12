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

  const placementMap: Record<string, string> = {
    top: "bottom-full left-0 mb-2",
    bottom: "top-full left-0 mt-2",
    left: "right-full top-0 mr-2",
    right: "left-full top-0 ml-2",
    "right-start": "left-full top-0 ml-2",
    "left-start": "right-full top-0 mr-2",
  };

  function show() {
    open = true;
  }

  function hide() {
    open = false;
  }

  function toggle() {
    open = !open;
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

    return () => {
      triggerElement?.removeEventListener("click", onClick);
      triggerElement?.removeEventListener("mouseenter", onEnter);
      triggerElement?.removeEventListener("mouseleave", onLeave);
      dropdownElement?.removeEventListener("mouseenter", onEnter);
      dropdownElement?.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("click", onDocClick);
    };
  });
</script>

<div
  bind:this={dropdownElement}
  class="absolute z-50 min-w-40 rounded-box border border-base-300 bg-base-100 p-1 shadow-xl {placementMap[placement] || placementMap.bottom} {open ? 'block' : 'hidden'} {customClass}"
  role="menu"
>
  {#if children}
    {@render children()}
  {/if}
</div>
