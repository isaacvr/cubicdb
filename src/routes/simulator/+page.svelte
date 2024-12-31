<script lang="ts">
  import { getTitleMeta } from "$lib/meta/title";
  import Simulator from "$lib/simulator/Simulator.svelte";
  import { puzzleReg } from "@classes/puzzle/puzzleRegister";
  import { PuzzleTypeName, type PuzzleType } from "@interfaces";
  import { localLang } from "@stores/language.service";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { sha1 } from "object-hash";
  import { dataService } from "$lib/data-services/data.service";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import Button from "$lib/cubicdbKit/Button.svelte";
  import Select from "@components/material/Select.svelte";
  import PuzzleImage from "@components/PuzzleImage.svelte";
  import { RefreshCw, Settings2 } from "lucide-svelte";
  import Tooltip from "$lib/cubicdbKit/Tooltip.svelte";

  let selectedPuzzle: PuzzleType = $state("rubik");
  let currentPuzzle: PuzzleType = $state("rubik");
  let order = $state(3);
  let excludedPuzzles: PuzzleType[] = ["icarry", "redibarrel"];
  let puzzles: { name: string; value: PuzzleType; order: boolean; img: string }[] = $state([]);
  let hasOrder = $state(true);
  let showOptions = $state(true);
  let showBackFace = $state(false);

  let simulator: Simulator;

  function getTitle(n: string, p: PuzzleType, o: number) {
    let info = puzzleReg.get(p);

    if (info) {
      return [
        getTitleMeta($page.url.pathname, $localLang).title,
        ...(info.order ? [info.name + ` ${o}x${o}`] : [info.name]),
      ].join(" - ");
    }

    return n;
  }

  function updatePuzzle(loc: URL) {
    let paramMap = loc.searchParams;
    let p = paramMap.get("puzzle") || "";
    let o = parseInt(paramMap.get("order") || "3");

    if (PuzzleTypeName.indexOf(p as any) > -1 && p != selectedPuzzle) {
      selectedPuzzle = p as any;
    }

    if (order != Math.max(1, o)) {
      order = Math.max(1, o);
    }

    updateURL({
      detail: {
        puzzle: selectedPuzzle,
        order,
      },
    } as any);
  }

  function updateURL(ev: CustomEvent) {
    if (!browser) return;

    let p = ev.detail.puzzle;
    let o = ev.detail.order;
    let pInfo = puzzleReg.get(p);

    if (!pInfo) return;

    selectedPuzzle = p;
    order = o;

    if (pInfo.order) {
      goto($page.url.pathname + `/?puzzle=${p}&order=${o}`, { replaceState: true });
    } else {
      goto($page.url.pathname + `/?puzzle=${p}`, { replaceState: true });
    }
  }

  function setOrder() {
    hasOrder = !!puzzles.find(p => p.value === selectedPuzzle)?.order;
  }

  function keyDownHandler(e: KeyboardEvent) {
    switch (e.code) {
      case "Escape": {
        if (showOptions) {
          showOptions = false;
        }
        break;
      }
      case "Comma": {
        if (e.ctrlKey) {
          showOptions = true;
        }
        break;
      }
    }
  }

  function setPuzzle() {
    simulator.resetPuzzle(selectedPuzzle, order, "");
    showOptions = false;
    currentPuzzle = selectedPuzzle;
  }

  updatePuzzle($page.url);

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

  $effect(() => setOrder());
  $effect(() => {
    showOptions;
    setTimeout(() => simulator.handleResize(), 250);
  });
</script>

<svelte:head>
  <title>{getTitle($localLang.HOME.simulator, selectedPuzzle, order)}</title>
</svelte:head>

<svelte:window onkeydown={keyDownHandler} onresize={() => simulator.handleResize()} />

<div class="simulator" class:expanded={showOptions}>
  <div class="shaded-card relative overflow-hidden" onresize={() => console.log("RESIZE")}>
    <div class="config flex items-center justify-between relative z-20">
      <h2 class="name font-bold">{puzzles.find(p => p.value === currentPuzzle)?.name || ""}</h2>

      <div class="flex items-center gap-2 ml-auto w-fit">
        <input bind:checked={showBackFace} type="checkbox" class="toggle" />

        <Tooltip keyBindings={["control", "b"]}>
          {$localLang.global.showBackFace}
        </Tooltip>

        <Button onclick={() => simulator.scramble()} style="--dash: 23;">
          <RefreshCw size="1.2rem" />
        </Button>

        <Tooltip keyBindings={["control", "d"]}>
          {$localLang.global.toScramble}
        </Tooltip>

        <Button
          onclick={() => (showOptions = true)}
          class={showOptions ? "!hidden" : ""}
          style="--dash: 18;"
        >
          <Settings2 size="1.2rem" />
        </Button>

        <Tooltip keyBindings={["control", "comma"]}>
          {$localLang.global.settings}
        </Tooltip>
      </div>
    </div>

    <Simulator
      bind:this={simulator}
      bind:showBackFace
      contained
      enableKeyboard
      {selectedPuzzle}
      {order}
    />
  </div>

  <div class="shaded-card relative flex flex-col">
    <h2 class="tx-primary-50 mb-2 font-bold">{$localLang.global.settings}</h2>

    <div class="grid grid-cols-[auto_auto] gap-2 place-items-center text-sm">
      <span>{$localLang.SIMULATOR.puzzle}</span>

      <Select
        items={puzzles}
        label={e => e.name}
        bind:value={selectedPuzzle}
        onChange={setOrder}
        class="w-full max-w-[unset]"
        hasIcon={e => e.img}
        IconComponent={PuzzleImage}
        iconKey="src"
        iconSize="3rem"
        useFixed
        placement="left-start"
      />

      {#if hasOrder}
        <span>{$localLang.SIMULATOR.order}</span>

        <input
          type="number"
          placeholder={$localLang.SIMULATOR.order}
          class="input input-bordered w-full max-w-xs"
          min={1}
          bind:value={order}
        />
      {/if}
    </div>

    <div class="action mt-auto flex items-center gap-2">
      <Button color="cancel" class="flex-1" onclick={() => (showOptions = false)}>
        {$localLang.global.cancel}
      </Button>
      <Button class="flex-1" onclick={setPuzzle}>{$localLang.global.accept}</Button>
    </div>
  </div>
</div>

<style>
  .simulator {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 0;
    transition: all 200ms;
    gap: 0.5rem;
    overflow: hidden;
  }

  .simulator.expanded {
    grid-template-columns: 1fr 16rem;
  }

  .simulator > :last-child {
    opacity: 0;
    visibility: hidden;
  }

  .simulator.expanded > :last-child {
    opacity: 1;
    visibility: visible;
  }
</style>
