<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Snippet } from "svelte";
  import { twMerge } from "tailwind-merge";

  type Size = "xs" | "sm" | "md" | "lg" | "xl";

  interface ButtonProps {
    loading?: boolean;
    children?: Snippet;
    onclick?: (event: MouseEvent) => void;
    class?: string;
    contentClass?: string;
    size?: Size;
    color?: string;
    href?: string;
    pill?: boolean;
    shadow?: boolean;
    file?: boolean;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    [key: string]: any;
  }

  const dispatch = createEventDispatcher<{
    click: MouseEvent;
    files: FileList;
    keydown: KeyboardEvent;
  }>();

  const SIZE_CLASS: Record<Size, string> = {
    xs: "btn-xs",
    sm: "btn-sm",
    md: "",
    lg: "btn-lg",
    xl: "btn-lg text-lg",
  };

  const COLOR_CLASS: Record<string, string> = {
    primary: "btn-primary",
    accept: "btn-secondary",
    cancel: "btn-neutral",
    urgent: "btn-accent",
    error: "btn-error",
    neutral: "btn-ghost border border-base-content/20",
    none: "btn-ghost bg-transparent border-transparent shadow-none",
    alternative: "btn-neutral",
    green: "btn-success",
    purple: "bg-purple-700 text-white hover:bg-purple-600 border-purple-700",
    red: "btn-error",
    blue: "btn-info",
    yellow: "btn-warning",
    dark: "btn-neutral",
  };

  let {
    class: cl = $bindable(""),
    loading = $bindable(false),
    size = $bindable("md"),
    color = $bindable("primary"),
    contentClass = $bindable(""),
    href,
    pill = false,
    shadow = false,
    file = false,
    disabled = false,
    type = "button",
    children,
    onclick = () => {},
    ...restProps
  }: ButtonProps = $props();

  let buttonClass = $derived(
    twMerge(
      "btn h-auto min-h-[unset] font-normal rounded-lg px-3 py-2",
      COLOR_CLASS[color] || color || COLOR_CLASS.primary,
      SIZE_CLASS[size],
      pill && "btn-circle rounded-full",
      shadow && "shadow-md",
      loading && "pointer-events-none",
      cl
    )
  );

  function handleClick(ev: MouseEvent) {
    if (disabled || loading) {
      ev.preventDefault();
      return;
    }

    onclick(ev);
    dispatch("click", ev);
  }

  function handleFiles(ev: Event) {
    const target = ev.currentTarget as HTMLInputElement;
    if (target.files) {
      dispatch("files", target.files);
    }
    target.value = "";
  }

  function handleKeydown(ev: KeyboardEvent) {
    dispatch("keydown", ev);
  }
</script>

{#if href}
  <a
    class={buttonClass}
    {href}
    aria-disabled={disabled}
    onclick={handleClick}
    onkeydown={handleKeydown}
    {...restProps}
  >
    <span class="contents {contentClass}">
      {#if children}
        {@render children()}
      {/if}
    </span>
  </a>
{:else if file}
  <label class={buttonClass} aria-disabled={disabled}>
    <input type="file" class="hidden" onchange={handleFiles} {...restProps} />
    <span
      class="contents cursor-pointer"
      role="button"
      tabindex={disabled ? -1 : 0}
      onkeydown={handleKeydown}
      onclick={handleClick}
    >
      {#if loading}
        <span class="loading loading-spinner loading-sm"></span>
      {/if}
      <span class={twMerge("contents", contentClass)} class:invisible={loading}>
        {#if children}
          {@render children()}
        {/if}
      </span>
    </span>
  </label>
{:else}
  <button
    class={buttonClass}
    {type}
    {disabled}
    onclick={handleClick}
    onkeydown={handleKeydown}
    {...restProps}
  >
    {#if loading}
      <span class="loading loading-spinner loading-sm"></span>
    {/if}
    <span class={twMerge("contents", contentClass)} class:invisible={loading}>
      {#if children}
        {@render children()}
      {/if}
    </span>
  </button>
{/if}
