<script lang="ts">
  interface IndicatorProps {
    color?: string;
    size?: "xs" | "sm" | "md" | "lg";
    class?: string;
  }

  let { color = "green", size = "sm", class: customClass = "" }: IndicatorProps = $props();

  const sizeMap = {
    xs: "w-2 h-2",
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const colorMap: Record<string, string> = {
    green: "bg-success",
    yellow: "bg-warning",
    blue: "bg-info",
  };
</script>

<span class="inline-block rounded-full {sizeMap[size]} {colorMap[color] || color} {customClass}"></span>
