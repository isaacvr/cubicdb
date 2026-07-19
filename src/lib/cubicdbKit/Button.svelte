<script lang="ts">
  import type { Snippet } from "svelte";
  import { twMerge } from "tailwind-merge";
  import type { ButtonNativeType, ButtonSize, ButtonType } from "./Button.types";

  interface ButtonProps {
    loading?: boolean;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
    class?: string;
    contentClass?: string;
    type?: ButtonType;
    size?: ButtonSize;
    href?: string;
    icon?: boolean;
    pill?: boolean;
    shadow?: boolean;
    disabled?: boolean;
    buttonType?: ButtonNativeType;
    [key: string]: any;
  }

  let {
    class: cl = $bindable(""),
    loading = $bindable(false),
    size = $bindable("md"),
    type = $bindable("primary"),
    contentClass = $bindable(""),
    href,
    icon = false,
    pill = false,
    shadow = false,
    disabled = false,
    buttonType = "button",
    children,
    onclick = () => {},
    ...restProps
  }: ButtonProps = $props();

  let buttonClass = $derived(
    twMerge(
      "btn cdb-button h-auto min-h-[unset] font-normal",
      pill && "rounded-full",
      shadow && "shadow-md",
      loading && "pointer-events-none",
      cl
    )
  );

  let sharedAttributes = $derived({
    ...restProps,
    class: buttonClass,
    "data-type": type,
    "data-size": size,
    "data-icon": icon,
    "data-loading": loading,
    onclick: handleClick,
  });

  function handleClick(ev: MouseEvent) {
    if (disabled || loading) {
      ev.preventDefault();
      return;
    }

    onclick(ev);
  }
</script>

{#snippet content()}
  {#if loading}
    <span class="loading loading-spinner loading-sm"></span>
  {/if}
  <span class={twMerge("contents", contentClass)} class:invisible={loading}>
    {#if children}
      {@render children()}
    {/if}
  </span>
{/snippet}

{#if href}
  <a {href} aria-disabled={disabled} {...sharedAttributes}>
    {@render content()}
  </a>
{:else}
  <button type={buttonType} {disabled} {...sharedAttributes}>
    {@render content()}
  </button>
{/if}
