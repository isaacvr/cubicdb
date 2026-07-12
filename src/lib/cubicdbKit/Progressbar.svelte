<script lang="ts">
  interface ProgressbarProps {
    value?: number;
    progress?: number;
    max?: number;
    class?: string;
    color?: string;
    size?: string;
  }

  let {
    value,
    progress,
    max = 100,
    class: customClass = "",
    color = "primary",
    size = "",
  }: ProgressbarProps = $props();
</script>

<progress
  class="progress progress-{color} w-full {size} {customClass}"
  value={progress ?? value ?? 0}
  {max}
></progress>
