<script lang="ts">
  interface SpinnerProps {
    size?: "xs" | "sm" | "md" | "lg";
    color?: string;
  }

  let { size = "md", color = "primary" }: SpinnerProps = $props();

  const sizeMap = {
    xs: "w-4 h-4",
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };
</script>

<div class="flex justify-center items-center">
  <div class="loading loading-spinner loading-{size} text-{color}"></div>
</div>
