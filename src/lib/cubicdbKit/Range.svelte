<script lang="ts">
  import { twMerge } from "tailwind-merge";

  interface RangeProps {
    min?: number;
    max?: number;
    value?: number;
    step?: number;
    class?: string;
  }

  let {
    min = $bindable(0),
    max = $bindable(100),
    value = $bindable(50),
    step = $bindable(-1),
    class: cl = $bindable(""),
  }: RangeProps = $props();

  let rangeClass = $derived(
    twMerge("range [--range-shdw:hsl(var(--th-primary))] bg-primary bg-opacity-20 rounded-md", cl)
  );
</script>

<input type="range" {min} {max} {step} bind:value class={rangeClass} />
