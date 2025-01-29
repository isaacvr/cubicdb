<script lang="ts">
  import { onMount, tick, untrack } from "svelte";
  import Simulator from "$lib/simulator/Simulator.svelte";
  import type { IDBReconstruction, PuzzleType, Scrambler } from "@interfaces";
  import TextArea from "@material/TextArea.svelte";
  import { screen } from "@stores/screen.store";
  import { localLang } from "@stores/language.service";
  import { NotificationService } from "@stores/notification.service";
  import { map, minmax } from "@helpers/math";
  import { copyToClipboard, parseReconstruction } from "@helpers/strings";

  import { errorIndex } from "./ReconstructionC";

  import { page } from "$app/stores";
  import { DOMAIN } from "@constants";
  import { dataService } from "$lib/data-services/data.service";
  import Tooltip from "$lib/cubicdbKit/Tooltip.svelte";
  import {
    CopyIcon,
    PauseIcon,
    PlayIcon,
    RotateCcwIcon,
    SearchIcon,
    Settings2Icon,
    StepBackIcon,
    StepForwardIcon,
    SwitchCameraIcon,
  } from "lucide-svelte";
  import Button from "$lib/cubicdbKit/Button.svelte";
  import Select from "@components/material/Select.svelte";
  import Range from "$lib/cubicdbKit/Range.svelte";
  import { fly } from "svelte/transition";
  import { debounce } from "@helpers/timer";

  let scramble = $state("");
  let reconstruction = $state("");

  let recs: IDBReconstruction[] = [];

  let recIndex = 1;
  let recSearch = $state("");

  const PUZZLES: { puzzle: PuzzleType; name: string; order: number; scrambler: Scrambler | "" }[] =
    $state([
      { puzzle: "rubik", name: "2x2x2", order: 2, scrambler: "222so" }, // 0
      { puzzle: "rubik", name: "3x3x3", order: 3, scrambler: "333" }, // 1
      { puzzle: "rubik", name: "4x4x4", order: 4, scrambler: "444wca" }, // 2
      { puzzle: "rubik", name: "5x5x5", order: 5, scrambler: "555wca" }, // 3
      { puzzle: "rubik", name: "6x6x6", order: 6, scrambler: "666wca" }, // 4
      { puzzle: "rubik", name: "7x7x7", order: 7, scrambler: "777wca" }, // 5
      { puzzle: "rubik", name: "8x8x8", order: 8, scrambler: "" }, // 6
      { puzzle: "square1", name: "Square-1", order: -1, scrambler: "sqrs" }, // 7
      { puzzle: "pyraminx", name: "Pyraminx", order: 3, scrambler: "pyrso" }, // 8
      { puzzle: "skewb", name: "Skewb", order: -1, scrambler: "skbso" }, // 9
      { puzzle: "megaminx", name: "Megaminx", order: 3, scrambler: "mgmp" }, // 10
      { puzzle: "clock", name: "Clock", order: -1, scrambler: "clkwca" }, // 11
      { puzzle: "masterskewb", name: "Master Skewb", order: -1, scrambler: "skbso" }, // 12
      { puzzle: "void", name: "Void Cube", order: 3, scrambler: "333" }, // 13
    ]);

  let puzzle = $state(PUZZLES[1]);

  let simulator = $state<ReturnType<typeof Simulator>>();
  let sTextarea = $state<ReturnType<typeof TextArea>>();
  let rTextarea = $state<ReturnType<typeof TextArea>>();

  let showBackFace = $state(true);
  let title = $state("");
  let backURL = "";

  let sequence: string[] = $state([]);
  let sequenceIndex: number[] = [];
  let sequenceAlpha = $state(0);
  let playing = $state(false);
  let initTime = 0;
  let finalTime = 0;
  let initAlpha = 0;
  let finalAlpha = $state(0);
  let speed = $state(1);
  let lastId = -1;
  let mounted = false;
  let limit = -1;
  let dir: 1 | -1 = 1;
  let showOptions = $state(true);
  let fRecs: IDBReconstruction[] = $state([]);

  function isSameArray(a: any[], b: any[]): boolean {
    if (a.length != b.length) return false;
    return a.every((e, i) => e === b[i]);
  }

  function parse(s: string, saveResult = false) {
    let rec = parseReconstruction(s, puzzle.puzzle, puzzle.order);

    if (saveResult) {
      if (
        (isSameArray(sequence, rec.sequence) && isSameArray(sequenceIndex, rec.sequenceIndex)) ||
        rec.hasError
      ) {
        return rec.result;
      }

      finalAlpha = rec.finalAlpha;
      sequence = rec.sequence;
      sequenceIndex = rec.sequenceIndex;
      sequenceAlpha = 0;
    }

    return rec.result;
  }

  function play() {
    if (!playing) return;

    let t = performance.now();
    let a = map(
      t,
      initTime,
      finalTime,
      map(dir, -1, 1, finalAlpha, initAlpha),
      map(dir, -1, 1, initAlpha, finalAlpha)
    );

    if (limit >= 0) {
      if ((a - limit) * dir > 0) {
        a = limit;
        playing = false;
        limit = -1;
      }
    }

    sequenceAlpha = minmax(a, initAlpha, finalAlpha);

    if (a < initAlpha || a > finalAlpha) {
      playing = false;
      limit = -1;
    } else if (playing) {
      requestAnimationFrame(play);
    }
  }

  function recomputeTimeBounds(s: number, inv = false) {
    untrack(() => {
      let percent = (sequenceAlpha - initAlpha) / (finalAlpha - initAlpha);
      let total = (finalAlpha * 1000) / s;

      finalTime = performance.now() + total * (1 - (inv ? 1 - percent : percent));
      initTime = finalTime - total;
    });
  }

  function handlePlay() {
    if (finalAlpha === 0) return;

    limit = -1;

    if (playing) {
      playing = false;
    } else {
      if (sequenceAlpha === finalAlpha) {
        sequenceAlpha = 0;
      }

      playing = true;
      dir = 1;
      recomputeTimeBounds(speed);
      play();
    }
  }

  function handleSequenceAlpha(a: number) {
    if (!mounted) return;

    let id = sequenceIndex[~~a];

    if (lastId != id && id >= initAlpha && id < finalAlpha) {
      let allMoves = rTextarea?.getContentEdit()?.querySelectorAll(".move:not(.silent)") || [];
      allMoves.forEach(mv => mv.classList.remove("current"));
      if (allMoves[id]) {
        allMoves[id].classList.add("current");
        showOptions && allMoves[id].scrollIntoView({ block: "nearest" });
      }
      lastId = id;
    }
  }

  function step(d: 1 | -1) {
    if (finalAlpha === 0) return;

    limit = d === 1 ? ~~sequenceAlpha + 1 : Math.ceil(sequenceAlpha) - 1;
    dir = d;
    recomputeTimeBounds(speed * 2, d === -1);
    playing = true;
    play();
  }

  function handleKeydown(ev: KeyboardEvent) {
    switch (ev.code) {
      case "KeyP": {
        if (ev.ctrlKey || ev.metaKey) {
          ev.preventDefault();
          handlePlay();
        }
        break;
      }

      case "KeyB": {
        ev.ctrlKey && (showBackFace = !showBackFace);
        break;
      }

      case "Comma": {
        if (ev.ctrlKey) {
          showOptions = true;
        }
        // ev.ctrlKey && ((recIndex -= 1), setRecIndex());
        break;
      }

      case "Period": {
        // ev.ctrlKey && ((recIndex += 1), setRecIndex());
        break;
      }

      case "ArrowLeft": {
        ev.ctrlKey && step(-1);
        break;
      }

      case "ArrowRight": {
        ev.ctrlKey && step(1);
        break;
      }

      case "ArrowUp": {
        ev.ctrlKey && (speed = minmax(speed + 0.1, 0.1, 10));
        break;
      }

      case "ArrowDown": {
        ev.ctrlKey && (speed = minmax(speed - 0.1, 0.1, 10));
        break;
      }

      case "Escape": {
        if (showOptions) {
          showOptions = false;
        }
        break;
      }
    }
  }

  async function resetPuzzle() {
    await tick();
    simulator?.handleSequence(sequence, scramble);
    sTextarea?.updateInnerText();
    rTextarea?.updateInnerText();
  }

  async function handleLocation(loc: URL) {
    let map = loc.searchParams;
    let p = map.get("puzzle");
    let o = parseInt(map.get("order") || "-1");
    let s = (map.get("scramble") || "").replace(/_/g, " ");
    let r = (map.get("reconstruction") || "").replace(/_/g, " ");
    let id = parseInt(map.get("recIndex") || "-1");

    backURL = (map.get("returnTo") || "").trim();

    if (id) {
      await new Promise(res => {
        let itv = setInterval(() => {
          if (recs.length != 0) {
            clearInterval(itv);
            res(true);
          }
        }, 30);
      });

      let rec = recs.find(rec => rec.num === id);

      if (rec) {
        recIndex = id;
        setRecIndex();
        return;
      }
    }

    for (let i = 0, maxi = PUZZLES.length; i < maxi; i += 1) {
      let pz = PUZZLES[i];

      if (pz.puzzle === p) {
        if (pz.order === -1 || (pz.order > 0 && pz.order === o)) {
          puzzle = pz;
          scramble = s;
          reconstruction = r;
          return;
        }
      }
    }

    puzzle = PUZZLES[1];
    scramble = ``;
    reconstruction = ``;
  }

  function setRecIndex() {
    for (let i = 0, maxi = recs.length; i < maxi; i += 1) {
      if (recs[i].num != recIndex) continue;

      title = recs[i].title;
      scramble = recs[i].scramble;
      reconstruction = recs[i].solution;

      for (let j = 0, maxj = PUZZLES.length; j < maxj; j += 1) {
        if (
          title.indexOf(PUZZLES[j].name) > -1 ||
          title.indexOf(PUZZLES[j].name.slice(0, 3)) > -1
        ) {
          puzzle = PUZZLES[j];
        }
      }

      break;
    }
  }

  function saveToIndex() {
    recs[recIndex].title = title;
    recs[recIndex].scramble = scramble;
    recs[recIndex].solution = reconstruction;
  }

  function downloadRecs() {
    let a = document.createElement("a");
    let b = new Blob([JSON.stringify(recs)], { type: "application/json" });
    a.href = URL.createObjectURL(b);
    a.download = "reconstructions.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function findReconstructions(inp: string) {
    if (!inp.trim()) return [];

    let parts = inp.split(/\s+/g).map(s => s.toLowerCase());

    return recs.filter(r => {
      let t = r.title.toLowerCase();
      return parts.every(p => t.includes(p));
    });
  }

  function copyReconstruction() {
    let rec1 = recs.find(r => r.num === recIndex) || recs[0];
    let rec = "";

    if (rec1.scramble === scramble && rec1.solution === reconstruction) {
      rec = `${DOMAIN}/reconstructions?recIndex=${recIndex}`;
    } else {
      rec = `${DOMAIN}/reconstructions?puzzle=${puzzle.puzzle}&order=${
        puzzle.order
      }&scramble=${encodeURIComponent(
        scramble.replace(/\s+/g, "_")
      )}&reconstruction=${encodeURIComponent(reconstruction.replace(/\s+/g, "_"))}`;
    }

    copyToClipboard(rec).then(() => {
      NotificationService.getInstance().addNotification({
        header: $localLang.global.done,
        text: $localLang.global.copiedToClipboard,
        timeout: 1000,
      });
    });
  }

  // function handleTextareaClick(ev: MouseEvent, textarea: HTMLTextAreaElement, pre: HTMLPreElement) {
  //   const spans = pre.querySelectorAll('span[data-cursor]:not([data-cursor="-1"])');
  //   const pos = { x: ev.x, y: ev.y };
  //   for (let i = 0, maxi = spans.length; i < maxi; i += 1) {
  //     let rec = spans[i].getBoundingClientRect();
  //     if (
  //       isBetween(pos.x, rec.x, rec.x + rec.width) &&
  //       isBetween(pos.y, rec.y, rec.y + rec.height)
  //     ) {
  //       sequenceAlpha = +(spans[i].getAttribute("data-cursor") || "");
  //       return;
  //     }
  //   }
  // }

  function handleResize() {
    let controls = document.querySelector(".controls");

    if (controls) {
      let pw = controls.parentElement?.clientWidth;
      (controls as any).style.width = pw + "px";
    }

    simulator?.handleResize();
  }

  function reset() {
    puzzle = PUZZLES[1];
    scramble = "";
    reconstruction = "";
    sequenceAlpha = 0;
    playing = false;
    limit = -1;
    showOptions = true;
    simulator?.resetCamera();
    simulator?.resetPuzzle(puzzle.puzzle, puzzle.order, "");
  }

  async function handleRangeClick() {
    playing = false;
    limit = -1;
    recomputeTimeBounds(speed);
  }

  onMount(() => {
    mounted = true;

    handleLocation($page.url);

    $dataService.reconstruction.getReconstructions().then(r => {
      recs = r.filter(rec => errorIndex.indexOf(rec.num) < 0);
    });

    handleResize();
  });

  $effect(() => recomputeTimeBounds(speed));
  $effect(() => handleSequenceAlpha(sequenceAlpha));

  $effect(() => {
    showOptions;
    setTimeout(() => simulator?.handleResize(), 250);
  });

  const updateFRecs = debounce(() => {
    fRecs = findReconstructions(recSearch);
  }, 400);

  $effect(() => {
    recSearch;
    updateFRecs();
  });
</script>

<svelte:window on:keydown={handleKeydown} on:resize={handleResize} />

<div class="simulator" class:expanded={showOptions}>
  <div class="shaded-card relative overflow-hidden flex flex-col">
    <div class="config flex items-center justify-between relative z-20">
      <h2 class="name font-bold">{title}</h2>

      <div class="flex items-center gap-2 ml-auto w-fit">
        <input bind:checked={showBackFace} type="checkbox" class="toggle" />

        <Tooltip keyBindings={["control", "b"]}>
          {$localLang.global.showBackFace}
        </Tooltip>

        <Button onclick={() => simulator?.resetCamera()} style="--dash: 18;">
          <SwitchCameraIcon size="1.2rem" />
        </Button>

        <Tooltip>
          {$localLang.RECONSTRUCTIONS.resetCamera}
        </Tooltip>

        <Button onclick={reset} style="--dash: 18;">
          <RotateCcwIcon size="1.2rem" />
        </Button>

        <Tooltip>
          {$localLang.global.reset}
        </Tooltip>

        <Button
          onclick={() => (showOptions = true)}
          class={showOptions ? "!hidden" : ""}
          style="--dash: 18;"
        >
          <Settings2Icon size="1.2rem" />
        </Button>

        <Tooltip keyBindings={["control", "comma"]}>
          {$localLang.global.settings}
        </Tooltip>
      </div>
    </div>

    <Simulator
      contained
      controlled
      enableDrag={false}
      enableRotation
      {sequence}
      bind:selectedPuzzle={puzzle.puzzle}
      bind:order={puzzle.order}
      bind:this={simulator}
      bind:showBackFace
      bind:useScramble={scramble}
      bind:sequenceAlpha
      enableKeyboard={false}
      zoom={12}
    />

    {#if finalAlpha > 0}
      <div class="grid relative z-10 mt-auto gap-2" in:fly={{ y: 20 }} out:fly={{ y: 20 }}>
        <Range
          bind:value={sequenceAlpha}
          min={initAlpha}
          max={finalAlpha}
          step={0.025}
          onmousedown={handleRangeClick}
          class="range-xs"
          variant="progress"
          aria-label={$localLang.RECONSTRUCTIONS.reconstructionProgress}
        />

        <div class="grid grid-cols-[1fr_auto_1fr]">
          <div></div>
          <div class="flex justify-center gap-2">
            <Button onclick={() => step(-1)}><StepBackIcon size="1rem" /></Button>
            <Tooltip keyBindings={["control", "left"]}
              >{$localLang.RECONSTRUCTIONS.stepBack}</Tooltip
            >

            <Button onclick={handlePlay}>
              {#if playing}
                <PauseIcon size="1rem" />
              {:else if sequenceAlpha === finalAlpha}
                <RotateCcwIcon size="1rem" />
              {:else}
                <PlayIcon size="1rem" />
              {/if}
            </Button>
            <Tooltip keyBindings={["control", "p"]}>{$localLang.RECONSTRUCTIONS.playPause}</Tooltip>

            <Button onclick={() => step(1)}><StepForwardIcon size="1rem" /></Button>
            <Tooltip keyBindings={["control", "right"]}
              >{$localLang.RECONSTRUCTIONS.stepForward}</Tooltip
            >
          </div>
          <div class="flex justify-end">
            <div class="grid">
              <span class="text-xs text-center">
                {$localLang.RECONSTRUCTIONS.speed} ({Math.floor(speed * 10) / 10}x)
              </span>
              <Range min={0.1} max={10} step={0.1} bind:value={speed} class="max-w-[8rem]" />
            </div>
            <Tooltip keyBindings={["control", "updown"]}></Tooltip>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="shaded-card relative flex flex-col overflow-y-auto overflow-x-clip">
    <h2 class="tx-primary-50 mb-2 font-bold">{$localLang.global.settings}</h2>

    <div class="grid gap-2 text-sm">
      <label class="input grid grid-cols-[1.2rem_100%] items-center gap-2 text-sm relative">
        <SearchIcon size="1.2rem" />
        <input
          type="text"
          bind:value={recSearch}
          class="w-[calc(100%-1.7rem)]"
          placeholder={$localLang.RECONSTRUCTIONS.findReconstruction}
        />

        {#if fRecs.length > 0}
          <ul
            class="shaded-card !bg-base-100 rounded-md p-2 shadow-md max-h-[20rem]
          absolute top-[calc(100%+.25rem)] w-full overflow-y-auto z-10 grid gap-2
          grid-cols-1 overflow-x-clip"
          >
            {#each fRecs as rec}
              <li>
                <Button
                  class="w-[unset] font-normal"
                  onclick={() => {
                    recIndex = rec.num;
                    setRecIndex();
                    recSearch = "";
                  }}
                >
                  {rec.title}
                </Button>
              </li>
            {/each}
          </ul>
        {/if}
      </label>

      <span>{$localLang.SIMULATOR.puzzle}</span>

      <Select
        class="w-full"
        bind:value={puzzle}
        items={PUZZLES}
        transform={e => e}
        label={e => e.name}
        onChange={resetPuzzle}
        hasIcon={e => e.scrambler}
      />

      <span>{$localLang.global.scramble}</span>

      <TextArea
        bind:value={scramble}
        getInnerText={s => parse(s, false)}
        placeholder={$localLang.RECONSTRUCTIONS.scramble}
        bind:this={sTextarea}
      />

      <span class="flex items-center gap-2">
        {$localLang.global.reconstruction}

        <button aria-label={$localLang.global.copy} onclick={copyReconstruction}>
          <CopyIcon size="1rem" />
        </button>
        <Tooltip>{$localLang.global.copy}</Tooltip>
      </span>

      <TextArea
        class="rounded-none border-none absolute inset-0"
        placeholder={$localLang.RECONSTRUCTIONS.reconstruction}
        bind:value={reconstruction}
        cClass="h-[30vh]"
        getInnerText={s => parse(s, true)}
        bind:this={rTextarea}
      />
    </div>

    <div class="action mt-auto flex items-center gap-2">
      <Button class="flex-1 bg-primary" onclick={() => (showOptions = false)}>
        {$localLang.global.accept}
      </Button>
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
