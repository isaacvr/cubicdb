<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { twMerge } from "tailwind-merge";

  type RangeVariants = "default" | "progress";

  interface RangeProps {
    min?: number;
    max?: number;
    value?: number;
    step?: number | string;
    class?: string;
    size?: string;
    "aria-label"?: string;
    variant?: RangeVariants;
    onclick?: (ev: MouseEvent) => any;
    onmousedown?: (ev: MouseEvent) => any;
  }

  const dispatch = createEventDispatcher<{
    change: { value: number };
  }>();

  let {
    min = $bindable(0),
    max = $bindable(100),
    value = $bindable(50),
    step = $bindable(-1),
    class: cl = $bindable(""),
    size = $bindable(""),
    "aria-label": ariaLabel = "",
    variant = $bindable("default"),
    onclick = () => {},
    onmousedown = () => {},
  }: RangeProps = $props();

  const RANGE_VARIANTS: Record<RangeVariants, string> = {
    default: "range-primary",
    progress: "range-secondary",
  };

  let rangeClass = $derived(
    twMerge("range bg-base-100 rounded-md", RANGE_VARIANTS[variant], size, cl)
  );

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    value = target.valueAsNumber;
    dispatch("change", { value });
  }
</script>

<input
  {onclick}
  {onmousedown}
  type="range"
  {min}
  {max}
  {step}
  bind:value
  class={rangeClass}
  aria-label={ariaLabel}
  oninput={handleInput}
/>
