<script lang="ts">
  import { onMount, type Snippet } from "svelte";

  interface DropdownProps {
    trigger?: HTMLElement | null;
    placement?: "top" | "bottom" | "left" | "right";
    class?: string;
    children?: Snippet;
  }

  let {
    trigger = $bindable(),
    placement = "bottom",
    class: customClass = "",
    children,
  }: DropdownProps = $props();

  let isOpen = $state(false);
  let dropdownElement: HTMLDivElement | undefined;
  let triggerElement: HTMLElement | null = trigger ?? null;

  onMount(() => {
    if (triggerElement) {
      const handleClick = () => {
        isOpen = !isOpen;
      };

      triggerElement.addEventListener("click", handleClick);

      const handleClickOutside = (e: MouseEvent) => {
        if (
          dropdownElement &&
          !dropdownElement.contains(e.target as Node) &&
          !triggerElement?.contains(e.target as Node)
        ) {
          isOpen = false;
        }
      };

      document.addEventListener("click", handleClickOutside);

      return () => {
        triggerElement?.removeEventListener("click", handleClick);
        document.removeEventListener("click", handleClickOutside);
      };
    }
  });

  const getPositionClasses = () => {
    const baseClasses = "absolute z-50 mt-2 bg-base-100 rounded-lg shadow-lg";
    switch (placement) {
      case "top":
        return `${baseClasses} bottom-full mb-2`;
      case "left":
        return `${baseClasses} right-full mr-2`;
      case "right":
        return `${baseClasses} left-full ml-2`;
      default:
        return `${baseClasses} top-full`;
    }
  };
</script>

<div
  bind:this={dropdownElement}
  class="{getPositionClasses()} {isOpen ? 'block' : 'hidden'} {customClass}"
  role="menu"
>
  {#if children}
    {@render children()}
  {/if}
</div>
