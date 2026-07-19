<script lang="ts">
  import type { Component } from "svelte";
  import { twMerge } from "tailwind-merge";

  interface IconButtonProps {
    icon: Component<any>;
    label: string;
    onclick?: (event: MouseEvent) => void;
    class?: string;
    iconClass?: string;
    size?: "sm" | "md";
    variant?: "ghost" | "primary";
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
  }

  let {
    icon: Icon,
    label,
    onclick = () => {},
    class: customClass = "",
    iconClass = "",
    size = "sm",
    variant = "ghost",
    disabled = false,
    type = "button",
  }: IconButtonProps = $props();
</script>

<button
  {type}
  {disabled}
  aria-label={label}
  class={twMerge("cdb-icon-button", customClass)}
  data-size={size}
  data-variant={variant}
  onclick={onclick}
>
  <Icon size={size === "md" ? 20 : 16} class={iconClass} />
</button>
