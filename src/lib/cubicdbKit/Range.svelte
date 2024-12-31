<script lang="ts">
  import { twMerge } from "tailwind-merge";

  type RangeVariants = "default" | "progress";

  interface RangeProps {
    min?: number;
    max?: number;
    value?: number;
    step?: number;
    class?: string;
    "aria-label"?: string;
    variant?: RangeVariants;
    onclick?: (ev: MouseEvent) => any;
    onmousedown?: (ev: MouseEvent) => any;
  }

  let {
    min = $bindable(0),
    max = $bindable(100),
    value = $bindable(50),
    step = $bindable(-1),
    class: cl = $bindable(""),
    "aria-label": ariaLabel = "",
    variant = $bindable("default"),
    onclick = (ev: MouseEvent) => {},
    onmousedown = (ev: MouseEvent) => {},
  }: RangeProps = $props();

  const RANGE_VARIANTS: Record<RangeVariants, string> = {
    default: "[--range-shdw:transparent] focus-visible:[--tf:var(--bc)] [&]:[--tb:var(--p)]",
    progress: "[--range-shdw:oklch(var(--p))] focus-visible:[--tf:var(--b1)] [&]:[--tb:var(--bc)]",
  };

  let rangeClass = $derived(
    twMerge(
      "range bg-base-100 rounded-md outline-transparent ",
      "range-" + variant,
      RANGE_VARIANTS[variant],
      cl
    )
  );
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
/>
