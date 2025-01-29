<script lang="ts">
  import DownloadIcon from "@icons/Download.svelte";
  import CopyIcon from "@icons/ContentCopy.svelte";
  import CopyCodeIcon from "@icons/CodeBrackets.svelte";
  import { Tooltip, Dropdown, DropdownItem } from "flowbite-svelte";
  import { localLang } from "$lib/stores/language.service";
  import { copyToClipboard, randomCSSId, replaceParams } from "@helpers/strings";
  import { NotificationService } from "@stores/notification.service";
  import type { Placement } from "@interfaces";
  import { toInt } from "@helpers/math";
  import Button from "$lib/cubicdbKit/Button.svelte";

  const notification = NotificationService.getInstance();

  interface PuzzleImageBundleProps {
    src?: string;
    size?: string;
    width?: string;
    height?: string;
    class?: string;
    downloadDivClass?: string;
    placement?: Placement;
    glowOnHover?: boolean;
    interactive?: boolean;
    allowDownload?: boolean;
    onclick?: (ev: MouseEvent) => any;
    onposition?: (data: { pos: number; type: number; consecutive: boolean }) => any;
  }

  let {
    src = $bindable(""),
    size = $bindable(""),
    width = $bindable(""),
    height = $bindable(""),
    downloadDivClass = $bindable(""),
    placement = $bindable("left"),
    class: _cl = $bindable(""),
    glowOnHover = $bindable(false),
    interactive = $bindable(false),
    allowDownload = $bindable(false),
    onclick = () => {},
    onposition = () => {},
  }: PuzzleImageBundleProps = $props();

  // let _cl = "";
  // export { _cl as class };

  type ImageType = "raster" | "svg";

  // let dispatch = createEventDispatcher();
  let type: ImageType = $state("raster");
  let imgWidth: number = $state(0);
  let imgHeight: number = $state(0);
  const downloadFactors = [0.25, 0.5, 1, 2, 5, 10];

  function detect(s?: string) {
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
    onclick(e);

    if (!interactive || type != "svg") return;

    let tg = e.target as SVGPathElement;
    let pos = tg.getAttribute("data-position");

    if (pos && onposition) {
      onposition({ pos: +pos, type: e.ctrlKey ? 1 : 0, consecutive: e.shiftKey });
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

  $effect(() => {
    detect(src);
  });
</script>

<div
  class={"rounded flex place-items-center puzzle-img w-full h-full " +
    (!src ? " bg-gray-700 animate-pulse " : " ") +
    (_cl || "")}
  style:width={width || size || "100%"}
  style:height={height || size}
  class:interactive
  class:glow={glowOnHover}
  role={type === "svg" ? "document" : "img"}
  onclick={handleClick}
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
      onclick={e => e.stopPropagation()}
      role="button"
      tabindex="-1"
      onkeyup={() => {}}
    >
      <Button class="bg-base-200">
        <DownloadIcon />
      </Button>
      <Dropdown
        trigger="hover"
        placement="right-start"
        class="bg-base-100 text-base-content rounded-md"
      >
        {#each downloadFactors as f}
          <DropdownItem class="hover:bg-primary" onclick={() => handleDownload(f)}>
            {toInt(imgWidth * f, 0)}x{toInt(imgHeight * f, 0)}
          </DropdownItem>
        {/each}
      </Dropdown>

      <Button class="bg-base-200"><CopyIcon /></Button>
      <Dropdown
        trigger="hover"
        placement="right-start"
        class="bg-base-100 text-base-content rounded-md"
      >
        {#each downloadFactors as f}
          <DropdownItem class="hover:bg-primary" onclick={() => handleCopy(f)}>
            {toInt(imgWidth * f, 0)}x{toInt(imgHeight * f, 0)}
          </DropdownItem>
        {/each}
      </Dropdown>

      {#if type === "svg"}
        <Button class="bg-base-200" onclick={handleCopyCode}><CopyCodeIcon /></Button>
        <Tooltip class="bg-base-100 text-base-content z-10" {placement}
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
    height: auto;
    width: fit-content;
    margin: auto;
    max-height: 100%;
    max-width: 100%;
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
