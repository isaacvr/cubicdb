<script lang="ts">
  interface SpinnerProps {
    size?: string;
    color?: string;
    class?: string;
  }

  let { size = "md", color = "primary", class: customClass = "" }: SpinnerProps = $props();

  const sizeMap: Record<string, string> = {
    xs: "loading-xs",
    sm: "loading-sm",
    md: "loading-md",
    lg: "loading-lg",
    "4": "loading-sm",
    "6": "loading-md",
    "8": "loading-lg",
    "10": "loading-lg",
    "20": "loading-lg",
  };
</script>

<span class="loading loading-spinner {sizeMap[size] || 'loading-md'} text-{color} {customClass}"></span>
