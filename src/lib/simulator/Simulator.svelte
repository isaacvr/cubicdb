<script lang="ts">
  import { onDestroy, onMount, createEventDispatcher } from "svelte";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import type { PuzzleType } from "@interfaces";
  import { puzzleReg } from "@classes/puzzle/puzzleRegister";

  import SettingsIcon from "@icons/Cog.svelte";
  import Refresh from "@icons/Refresh.svelte";
  import Tooltip from "@material/Tooltip.svelte";
  import Input from "@material/Input.svelte";

  import { localLang } from "@stores/language.service";
  import { screen } from "@stores/screen.store";
  import { Button, Modal, Toggle } from "flowbite-svelte";
  import Select from "@material/Select.svelte";
  import { ThreeJSAdaptor } from "$lib/simulator/adaptors/ThreeJSAdaptor";
  import { ControlAdaptor } from "$lib/simulator/adaptors/ControlAdaptor";
  import { CubeMode } from "@constants";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import PuzzleImage from "@components/PuzzleImage.svelte";
  import { sha1 } from "object-hash";
  import { dataService } from "$lib/data-services/data.service";

  export let enableKeyboard = true;
  export let enableDrag = true;
  export let enableRotation = true;
  export let gui = true;
  export let contained = false;
  export let selectedPuzzle: PuzzleType = "rubik";
  export let order = 3;
  export let animationTime = $screen.isMobile ? 150 : 200; /// Default animation time: 200ms
  export let showBackFace = false;
  export let sequence: string[] = [];
  export let sequenceAlpha = 0;
  export let useScramble = "";
  export let zoom = 12;
  export let controlled = false;

  let _cl = "";

  export { _cl as class };

  const dispatch = createEventDispatcher();

  let canvas: HTMLCanvasElement;
  let threeAdaptor: ThreeJSAdaptor;
  let controlAdaptor: ControlAdaptor;

  /// GUI
  let excludedPuzzles: PuzzleType[] = ["icarry"];
  let puzzles: { name: string; value: PuzzleType; order: boolean; img: string }[] = [];
  let hasOrder = true;
  let GUIExpanded = false;
  let mounted = false;
  let lastS: string[] = [];
  let lastScr: string = "";

  for (let [key, value] of puzzleReg) {
    if (excludedPuzzles.indexOf(key as PuzzleType) === -1) {
      puzzles.push({
        name: value.name,
        value: key as PuzzleType,
        order: value.order,
        img: "",
      });
    }
  }

  (async () => {
    let hashes = puzzles.map(sha1);
    let imgCache = await $dataService.cache.cacheGetImageBundle(hashes);

    // Assign images
    imgCache.forEach((img, p) => (puzzles[p].img = img));

    let missingPos = imgCache.reduce((acc, e, p) => (e ? acc : [...acc, p]), [] as number[]);
    let cubes = missingPos.map(p => new Puzzle({ type: puzzles[p].value, order: [3] }));
    let imgs = await pGenerateCubeBundle(cubes);

    // Reassign the missing ones
    for (let i = 0, maxi = missingPos.length; i < maxi; i += 1) {
      let mp = missingPos[i];
      puzzles[mp].img = imgs[i];
      await $dataService.cache.cacheSaveImage(hashes[mp], imgs[i]);
    }
  })();

  export async function handleSequence(s: string[], scr: string) {
    lastS = s;
    lastScr = scr;

    if (!mounted) return;

    let nc: Puzzle;

    try {
      nc = Puzzle.fromSequence(lastScr, {
        type: selectedPuzzle,
        view: "trans",
        order: Array.isArray(order) ? order : [order, order, order],
        mode: CubeMode.NORMAL,
      });

      threeAdaptor.resetPuzzle("", false, lastScr);
      controlAdaptor.reset();

      if (nc.p.applySequence) {
        let seq = nc.p.applySequence(lastS);
        controlAdaptor.applySequence(nc, seq);
        sequenceAlpha = 0;
      }
    } catch (err) {
      console.log("ERROR: ", err);
    }
  }

  export function resetCamera() {
    threeAdaptor.resetCamera();
  }

  export function applyMove(m: string, t: number) {
    threeAdaptor.applyMove(m, t);
  }

  export function fromFacelet(f: string) {
    threeAdaptor.resetPuzzle(f);
  }

  export function resetPuzzle(p: PuzzleType, o: number, s: string) {
    threeAdaptor.selectedPuzzle = selectedPuzzle = p;
    threeAdaptor.order = order = o;
    threeAdaptor.resetPuzzle("", false, s);
  }

  // export function

  /// GUI
  function scramble() {
    threeAdaptor.resetPuzzle(undefined, true);
  }

  function setOrder() {
    hasOrder = !!puzzles.find(p => p.value === selectedPuzzle)?.order;
  }

  setOrder();

  function hideGUI() {
    GUIExpanded = false;
  }

  function showGUI() {
    GUIExpanded = true;
  }

  function keyDownHandler(e: KeyboardEvent) {
    if (!enableKeyboard) return;
    threeAdaptor.keyDownHandler(e);
    switch (e.code) {
      case "KeyB": {
        if (e.ctrlKey) {
          showBackFace = !showBackFace;
        }
        break;
      }
      case "KeyD": {
        if (e.ctrlKey) {
          threeAdaptor.resetPuzzle();
        }
        break;
      }
      case "Comma": {
        if (e.ctrlKey) {
          showGUI();
        }
        break;
      }
    }
  }

  onMount(() => {
    mounted = true;

    threeAdaptor = new ThreeJSAdaptor({
      enableKeyboard,
      enableDrag,
      selectedPuzzle,
      order,
      animationTime,
      showBackFace,
      zoom,
      canvas,
    });

    threeAdaptor.on("move:start", () => dispatch("move:start"));
    threeAdaptor.on("move:end", () => dispatch("move:end"));
    threeAdaptor.on("solved", () => dispatch("solved"));

    controlAdaptor = new ControlAdaptor(threeAdaptor);

    handleSequence(sequence, useScramble);
    controlAdaptor.handleAlpha(sequenceAlpha, mounted);

    threeAdaptor.resizeHandler(contained);
    threeAdaptor.render();

    setTimeout(() => threeAdaptor.resizeHandler(contained), 1000);
  });

  onDestroy(() => {
    threeAdaptor?.destroy();
  });

  $: mounted && threeAdaptor.controls && (threeAdaptor.controls.noRotate = !enableRotation);
  $: mounted && controlled && handleSequence(sequence, useScramble);
  $: mounted && controlled && controlAdaptor.handleAlpha(sequenceAlpha, mounted);
  $: mounted && (threeAdaptor.enableKeyboard = enableKeyboard);
  $: mounted && (threeAdaptor.enableDrag = enableDrag);
  $: mounted && (threeAdaptor.selectedPuzzle = selectedPuzzle);
  $: mounted && (threeAdaptor.order = order);
  $: mounted && (threeAdaptor.animationTime = animationTime);
  $: mounted && (threeAdaptor.showBackFace = showBackFace);
  $: mounted && threeAdaptor.setZoom(zoom);
</script>

<svelte:window
  on:resize={() => threeAdaptor.resizeHandler(contained)}
  on:keydown={keyDownHandler}
/>

<canvas bind:this={canvas} class={_cl || ""} />

{#if gui}
  <div class="absolute right-2 top-[5rem] flex flex-col gap-2 items-center ps-3">
    <Tooltip
      hasKeybinding
      position="left"
      on:click={showGUI}
      text={$localLang.SIMULATOR.settings + "[Ctrl + ,]"}
    >
      <Button
        color="alternative"
        class="h-8 w-8 p-0 me-3 rounded-full"
        aria-label={$localLang.SIMULATOR.settings}
      >
        <SettingsIcon size="1.2rem" />
      </Button>
    </Tooltip>

    {#if threeAdaptor && threeAdaptor.cube?.p.scramble}
      <Tooltip hasKeybinding position="left" text={$localLang.global.toScramble + "[Ctrl + S]"}>
        <Button
          on:click={scramble}
          color="alternative"
          class="h-8 w-8 p-0 me-3 rounded-full"
          aria-label={$localLang.global.toScramble}
        >
          <Refresh size="1.2rem" />
        </Button>
      </Tooltip>
    {/if}

    <Tooltip hasKeybinding text={$localLang.global.showBackFace + "[Ctrl + B]"} position="left">
      <Toggle
        class="cursor-pointer"
        bind:checked={showBackFace}
        aria-label={$localLang.global.showBackFace}
      />
    </Tooltip>
  </div>
{/if}

<Modal bind:open={GUIExpanded} size="xs" title={$localLang.SIMULATOR.puzzleSettings} outsideclose>
  <div class="grid grid-cols-[auto_auto] gap-4 place-items-center text-gray-400">
    <span>{$localLang.SIMULATOR.puzzle}</span>

    <Select
      items={puzzles}
      label={e => e.name}
      bind:value={selectedPuzzle}
      onChange={setOrder}
      class="text-gray-400 w-full max-w-[unset]"
      hasIcon={e => e.img}
      iconComponent={PuzzleImage}
      iconKey="src"
      iconSize="3rem"
    />

    {#if hasOrder}
      <span>{$localLang.SIMULATOR.order}</span>
      <Input
        on:UENTER={() => {
          threeAdaptor.resetPuzzle();
          hideGUI();
        }}
        type="number"
        min={1}
        bind:value={order}
        class="bg-white bg-opacity-10 text-gray-400 !w-20"
      />
    {/if}
  </div>

  <svelte:fragment slot="footer">
    <div class="flex flex-wrap items-center mx-auto gap-2">
      <Button color="alternative" on:click={hideGUI} aria-label={$localLang.global.cancel}>
        {$localLang.global.cancel}
      </Button>

      <Button
        color="green"
        on:click={() => {
          threeAdaptor.resetPuzzle();
          hideGUI();
          dispatch("config", { puzzle: selectedPuzzle, order: order });
        }}
        aria-label={$localLang.SIMULATOR.setPuzzle}
      >
        {$localLang.SIMULATOR.setPuzzle}
      </Button>
    </div>
  </svelte:fragment>
</Modal>
