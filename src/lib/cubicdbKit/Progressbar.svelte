<script lang="ts">
  interface ProgressbarProps {
    value: number;
    max?: number;
    class?: string;
    color?: string;
  }

  let { value, max = 100, class: customClass = "", color = "primary" }: ProgressbarProps = $props();
</script>

<progress
  class="progress progress-{color} w-full {customClass}"
  {value}
  {max}
></progress>
