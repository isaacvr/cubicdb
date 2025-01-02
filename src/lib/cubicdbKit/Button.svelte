<script lang="ts">
  import { twMerge } from "tailwind-merge";

  type Size = "sm" | "md" | "lg";
  type Color = "primary" | "accept" | "cancel" | "urgent";

  interface ButtonProps {
    loading?: boolean;
    children?: any;
    onclick?: Function;
    class?: string;
    contentClass?: string;
    size?: Size;
    color?: Color;
    [key: string]: any;
  }

  const SIZE_CLASS: Record<Size, string> = {
    sm: "p-1 text-sm",
    md: "p-2",
    lg: "px-3 py-2 text-lg",
  };

  const COLOR_CLASS: Record<Color, string> = {
    primary: "bg-base-100 hover:bg-primary text-base-content",
    accept: "btn-secondary",
    cancel: "btn-neutral",
    urgent: "btn-accent",
  };

  let {
    class: cl = $bindable(""),
    loading = $bindable(false),
    size = $bindable("md"),
    color = $bindable("primary"),
    contentClass = $bindable(""),
    children,
    onclick = () => {},
    ...restProps
  }: ButtonProps = $props();

  let buttonClass = $derived(
    twMerge("btn h-auto min-h-[unset] font-normal", COLOR_CLASS[color], SIZE_CLASS[size], cl)
  );

  function handleClick(ev: MouseEvent) {
    onclick(ev);
  }
</script>

<button class={buttonClass} class:isLoading={loading} onclick={handleClick} {...restProps}>
  <div class="loading loading-spinner loading-sm mx-auto"></div>
  <div class={twMerge("content flex gap-2 items-center justify-center", contentClass)}>
    {@render children?.()}
  </div>
</button>

<style>
  button {
    display: grid;
    grid-template-areas: "stack";
    place-content: center;
    justify-content: normal;
  }

  button > div {
    grid-area: stack;
  }

  button.isLoading > .content {
    opacity: 0;
    visibility: hidden;
  }

  button:not(.isLoading) > .loading {
    opacity: 0;
    visibility: hidden;
  }
</style>
