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
    showValue?: boolean;
    formatValue?: (value: number) => string;
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
    showValue = false,
    formatValue = value => String(value),
    onclick = () => {},
    onmousedown = () => {},
  }: RangeProps = $props();

  const RANGE_VARIANTS: Record<RangeVariants, string> = {
    default: "default",
    progress: "progress",
  };

  let formattedValue = $derived(formatValue(value));
  let rangeClass = $derived(twMerge("cdb-range-input", size, cl));

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    value = target.valueAsNumber;
    dispatch("change", { value });
  }
</script>

<div class="cdb-range-field" data-variant={RANGE_VARIANTS[variant]}>
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
    aria-valuetext={formattedValue}
    oninput={handleInput}
  />

  {#if showValue}
    <span class="cdb-range-value">{formattedValue}</span>
  {/if}
</div>
