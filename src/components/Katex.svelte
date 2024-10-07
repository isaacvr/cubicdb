<script lang="ts">
  import katex from "katex";
  export let math: string;
  export let displayMode = false;

  let katexString = "";

  const options = {
    displayMode: displayMode,
    throwOnError: false,
  };

  $: katexString = katex.renderToString(math, options);
</script>

{@html katexString}
