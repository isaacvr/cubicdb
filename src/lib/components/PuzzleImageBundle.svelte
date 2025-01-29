<script lang="ts">
  import PuzzleImage from "$lib/components/PuzzleImage.svelte";
  import { Button } from "flowbite-svelte";
  import { minmax } from "@helpers/math";
  import { blur } from "svelte/transition";
  import { localLang } from "$lib/stores/language.service";
  import { ChevronLeftIcon, ChevronRightIcon } from "lucide-svelte";

  interface PuzzleImageBundleProps {
    src?: string | string[];
    size?: string;
    width?: string;
    height?: string;
    class?: string;
    glowOnHover?: boolean;
    interactive?: boolean;
    allowDownload?: boolean;
    onclick?: (ev: MouseEvent) => any;
  }

  let {
    src = $bindable(""),
    size = $bindable(""),
    width = $bindable(""),
    height = $bindable(""),
    class: _cl = $bindable(""),
    glowOnHover = $bindable(false),
    interactive = $bindable(false),
    allowDownload = $bindable(false),
    onclick = () => {},
  }: PuzzleImageBundleProps = $props();

  let preview: string[] = $state([]);
  let selectedImg = $state(0);

  function step(ev: MouseEvent, v: number) {
    ev.stopPropagation();
    selectedImg = minmax(selectedImg + v, 0, preview.length);
  }

  function updatePreview() {
    preview = Array.isArray(src) ? src : [src];
    selectedImg = 0;
  }

  $effect(() => updatePreview());
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
  class={preview.length < 2 ? "hidden" : "rounded-full p-2 mt-2"}
>
  <ChevronLeftIcon class="pointer-events-none" />
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
  {onclick}
/>

<Button
  color="none"
  on:click={ev => step(ev, 1)}
  disabled={selectedImg + 1 === preview.length}
  class={preview.length < 2 ? "hidden" : "rounded-full p-2 mt-2"}
>
  <ChevronRightIcon class="pointer-events-none" />
</Button>
