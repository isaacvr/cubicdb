<script lang="ts">
  import PuzzleImage from "$lib/components/PuzzleImage.svelte";
  import { Button } from "flowbite-svelte";
  import { minmax } from "@helpers/math";
  import { blur } from "svelte/transition";
  import { localLang } from "$lib/stores/language.service";
  import { ChevronLeft, ChevronRight } from "lucide-svelte";

  let _cl = "";

  export let src: string | string[] = "";
  export let glowOnHover = false;
  export let interactive = false;
  export let size = "";
  export let width = "";
  export let height = "";
  export let allowDownload = false;
  export { _cl as class };

  let preview: string[] = [];
  let selectedImg = 0;

  function step(ev: MouseEvent, v: number) {
    ev.stopPropagation();
    selectedImg = minmax(selectedImg + v, 0, preview.length);
  }

  function updatePreview(s: string | string[]) {
    preview = Array.isArray(s) ? s : [s];
    selectedImg = 0;
  }

  $: updatePreview(src);
</script>

{#if preview.length > 1}
  <span class="absolute -top-1 left-1/2 -translate-x-2/3 transition-all" out:blur>
    {$localLang.global.scramble}
    {selectedImg + 1} / {preview.length}
  </span>
{/if}

<Button
  color="none"
  on:click={ev => step(ev, -1)}
  disabled={selectedImg === 0}
  class={"rounded-full w-[3rem] h-[3rem] " + (preview.length < 2 ? "hidden" : "mt-2")}
>
  <ChevronLeft class="pointer-events-none" />
</Button>

<PuzzleImage
  src={preview[selectedImg]}
  {glowOnHover}
  {interactive}
  {size}
  {width}
  {height}
  class={_cl + (preview.length > 1 ? "pt-4" : "")}
  {allowDownload}
/>

<Button
  color="none"
  on:click={ev => step(ev, 1)}
  disabled={selectedImg + 1 === preview.length}
  class={"rounded-full w-[3rem] h-[3rem] " + (preview.length < 2 ? "hidden" : "mt-2")}
>
  <ChevronRight class="pointer-events-none" />
</Button>
