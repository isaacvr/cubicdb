<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Button from "@material/Button.svelte";
  import DownloadIcon from "@icons/Download.svelte";
  import CopyIcon from "@icons/ContentCopy.svelte";
  import CopyCodeIcon from "@icons/CodeBrackets.svelte";
  import { Tooltip, Dropdown, DropdownItem } from "flowbite-svelte";
  import { localLang } from "$lib/stores/language.service";
  import { copyToClipboard, randomCSSId, replaceParams } from "@helpers/strings";
  import { NotificationService } from "@stores/notification.service";
  import type { Placement, Side } from "@interfaces";
  import e from "cors";
  import { toInt } from "@helpers/math";

  const notification = NotificationService.getInstance();

  export let src = "";
  export let glowOnHover = false;
  export let interactive = false;
  export let size = "";
  export let width = "";
  export let height = "";
  export let downloadDivClass = "";
  export let allowDownload = false;
  export let placement: Side | Placement = "left";

  let _cl = "";
  export { _cl as class };

  type ImageType = "raster" | "svg";

  let dispatch = createEventDispatcher();
  let type: ImageType = "raster";
  let imgWidth: number = 0;
  let imgHeight: number = 0;
  const downloadFactors = [0.25, 0.5, 1, 2, 5, 10];

  function detect(s: string) {
    if (!s) return s;

    if (s.startsWith("<?xml")) {
      type = "svg";
      let m = s.match(/viewBox="[^"]*"/);
      if (m) {
        let dims = m[0].slice(9, -1).split(" ").map(Number);
        imgWidth = dims[2] - dims[0];
        imgHeight = dims[3] - dims[1];
      }
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

  async function copyBlob(b: Blob | string) {
    if (typeof b === "string") {
      let blob = new Blob([b], { type: "image/png" });
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      notifyDone();
      return;
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        [b.type]: b,
      }),
    ]);

    notifyDone();
  }

  async function convertToPNG(svgString: string, f: number): Promise<Blob | null> {
    // Convert SVG string to Blob
    let blob = new Blob([svgString], { type: "image/svg+xml" });
    let url = URL.createObjectURL(blob);

    // Create an image element
    const img = new Image();

    return new Promise(res => {
      img.onload = async () => {
        URL.revokeObjectURL(url);

        // Create a canvas and draw the image on it
        const canvas = document.createElement("canvas");
        const W = toInt(img.width * f, 0);
        const H = toInt(img.height * f, 0);
        console.log("W_H: ", img.width, img.height, W, H);

        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d")!;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, 0, 0, W, H);

        // Convert canvas to blob
        canvas.toBlob(async blob => {
          if (!blob) {
            res(null);
            return;
          }
          try {
            res(blob);
          } catch (error) {
            console.error("Failed to copy: ", error);
            res(null);
          }
        }, "image/png");
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        console.error("Failed to load the SVG.");
        res(null);
      };

      img.src = url;
    });
  }

  function notifyDone() {
    notification.addNotification({
      header: $localLang.global.done,
      text: $localLang.global.copiedToClipboard,
      timeout: 1000,
    });
  }

  function downloadBlob(b: Blob, w: number, h: number) {
    let a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `CubicDB-img-${w}x${h}-${randomCSSId()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleDownload(f: number) {
    let imgW = toInt(imgWidth * f, 0);
    let imgH = toInt(imgHeight * f, 0);

    if (type === "svg") {
      let blob = await convertToPNG(src, f);
      if (!blob) return;
      return downloadBlob(blob, imgW, imgH);
    }

    downloadBlob(new Blob([src], { type: "image/png" }), imgW, imgH);
  }

  async function handleCopy(f: number) {
    if (type === "svg") {
      let blob = await convertToPNG(src, f);
      if (!blob) return;
      return await copyBlob(blob);
    }

    await copyBlob(src);
  }

  function handleCopyCode() {
    copyToClipboard(src).then(notifyDone);
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
    <img {src} alt="" bind:naturalHeight={imgHeight} bind:naturalWidth={imgWidth} />
  {/if}

  {#if allowDownload}
    <div
      class={"options absolute top-0 right-0 gap-1 grid " + downloadDivClass}
      on:click|stopPropagation={e => e}
      role="button"
      tabindex="-1"
      on:keyup={() => {}}
    >
      <Button class="bg-backgroundLevel3 hover:bg-urgentButton !px-2">
        <DownloadIcon />
      </Button>
      <Dropdown trigger="hover" placement="right-start" class="bg-backgroundLevel3 rounded-md">
        {#each downloadFactors as f}
          <DropdownItem on:click={() => handleDownload(f)}>
            {toInt(imgWidth * f, 0)}x{toInt(imgHeight * f, 0)}
          </DropdownItem>
        {/each}
      </Dropdown>

      <Button class="bg-backgroundLevel3 hover:bg-urgentButton !px-2"><CopyIcon /></Button>
      <Dropdown trigger="hover" placement="right-start" class="bg-backgroundLevel3 rounded-md">
        {#each downloadFactors as f}
          <DropdownItem on:click={() => handleCopy(f)}>
            {toInt(imgWidth * f, 0)}x{toInt(imgHeight * f, 0)}
          </DropdownItem>
        {/each}
      </Dropdown>

      {#if type === "svg"}
        <Button class="bg-backgroundLevel3 hover:bg-urgentButton !px-2" on:click={handleCopyCode}
          ><CopyCodeIcon /></Button
        >
        <Tooltip class="bg-backgroundLevel3 z-10" {placement}
          >{replaceParams($localLang.global.copyCode, ["SVG"])}</Tooltip
        >
      {/if}
    </div>
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
    /* background-color: red; */
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
