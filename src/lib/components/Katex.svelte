<script lang="ts">
  import katex from "katex";

  interface KatexProps {
    math: string;
    displayMode?: boolean;
  }

  let { math = $bindable(), displayMode = $bindable(false) }: KatexProps = $props();

  let katexString = $derived(
    katex.renderToString(math, {
      displayMode,
      throwOnError: false,
    })
  );
</script>

{@html katexString}
