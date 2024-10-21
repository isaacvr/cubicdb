<script lang="ts">
  import { createEventDispatcher } from "svelte";

  let _cl = "";

  export let src = "";
  export let glowOnHover = false;
  export let interactive = false;
  export let size = "";
  export let width = "";
  export let height = "";
  export { _cl as class };

  type ImageType = "raster" | "svg";

  let dispatch = createEventDispatcher();
  let type: ImageType = "raster";

  function detect(s: string) {
    if (s.startsWith("<?xml")) {
      type = "svg";
    } else {
      type = "raster";
    }
  }

  function handleClick(e: MouseEvent) {
    if (!interactive || type != "svg") return;

    let tg = e.target as SVGPathElement;
    let pos = tg.getAttribute("data-position");

    if (pos) {
      dispatch("position", { pos: +pos, type: e.ctrlKey ? 1 : 0, consecutive: e.shiftKey });
    }
  }

  $: detect(src);
</script>

<div
  class={"rounded flex items-center justify-center puzzle-img " +
    (!src ? " bg-gray-700 animate-pulse " : " ") +
    (_cl || "")}
  style:width={width || size || "100%"}
  style:height={height || size || "100%"}
  class:interactive
  class:glow={glowOnHover}
  role={type === "svg" ? "document" : "img"}
  on:click={handleClick}
>
  {#if !src}
    <svg
      width="48"
      height="48"
      class="text-gray-200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 640 512"
    >
      <path
        d="M480 80C480 35.82 515.8 0 560 0C604.2 0 640 35.82 640 80C640 124.2 604.2 160 560 160C515.8 160 480 124.2 480 80zM0 456.1C0 445.6 2.964 435.3 8.551 426.4L225.3 81.01C231.9 70.42 243.5 64 256 64C268.5 64 280.1 70.42 286.8 81.01L412.7 281.7L460.9 202.7C464.1 196.1 472.2 192 480 192C487.8 192 495 196.1 499.1 202.7L631.1 419.1C636.9 428.6 640 439.7 640 450.9C640 484.6 612.6 512 578.9 512H55.91C25.03 512 .0006 486.1 .0006 456.1L0 456.1z"
      />
    </svg>
  {:else if type === "svg"}
    {@html src}
  {:else}
    <img {src} alt="" />
  {/if}
</div>

<style lang="postcss">
  .puzzle-img {
    @apply transition-all duration-200;
    filter: drop-shadow(0 0 0rem #1d4ed8);
  }

  .puzzle-img.glow:hover {
    filter: drop-shadow(0 0 1rem #1d4ed8);
  }

  :global(.puzzle-img > img, .puzzle-img > svg) {
    object-fit: contain;
    aspect-ratio: 1;
    width: 100%;
    height: 100%;
  }

  :global(.puzzle-img.interactive path:not([data-position])) {
    pointer-events: none;
  }

  :global(.puzzle-img.interactive path[data-position]) {
    cursor: pointer;
    transition: all 200ms;
  }

  :global(.puzzle-img.interactive path[data-position]:hover) {
    filter: invert(0.7);
  }
</style>
