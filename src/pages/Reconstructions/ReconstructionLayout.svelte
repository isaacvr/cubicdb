<script lang="ts">
  import { onMount, tick } from "svelte";
  import { navigate, useLocation } from "svelte-routing";
  import { ArrowKeyLeft, ArrowKeyRight, Button, Kbd, Modal, Range, Tooltip } from "flowbite-svelte";
  import Simulator from "@pages/Simulator/SimulatorLayout.svelte";
  import type { PuzzleType, Scrambler } from "@interfaces";
  import TextArea from "@material/TextArea.svelte";
  import Checkbox from "@material/Checkbox.svelte";
  import Input from "@material/Input.svelte";
  import Select from "@material/Select.svelte";
  import { screen } from "@stores/screen.store";
  import { localLang } from "@stores/language.service";
  import { NotificationService } from "@stores/notification.service";
  import { map, minmax } from "@helpers/math";
  import { copyToClipboard, parseReconstruction } from "@helpers/strings";

  import { errorIndex } from "./ReconstructionC";

  // ICONS
  import RestartIcon from "@icons/Restart.svelte";
  import PlayIcon from "@icons/Play.svelte";
  import PauseIcon from "@icons/Pause.svelte";
  import StepBackIcon from "@icons/ChevronLeft.svelte";
  import StepForwardIcon from "@icons/ChevronRight.svelte";
  import BackIcon from "@icons/History.svelte";
  import SearchIcon from "@icons/SearchWeb.svelte";
  import ChevronLeft from "@icons/ChevronLeft.svelte";
  import CopyIcon from "@icons/ClipboardOutline.svelte";

  export let type: "full" | "controlled" = "full";
  export let scramble = "";
  export let reconstruction = "";
  export let puzzleType: PuzzleType = "rubik";
  export let puzzleOrder = 3;

  let recs: any[] = [];

  if (type === "full") {
    import("../../database/reconstructions.json").then(res => {
      recs = (res.default || []).filter(
        (r, p) => (p < 4300 || p >= 5338) && errorIndex.indexOf(r.id) < 0
      );
    });
  }

  let recIndex = 5347;
  let showRecSearch = false;
  let recSearch = "";

  const location = useLocation();

  const iconSize = "1.3rem";
  const PUZZLES: { puzzle: PuzzleType; name: string; order: number; scrambler: Scrambler | "" }[] =
    [
      // { puzzle: "helicopter", name: "Helicopter", order: -1, scrambler: '' },       // 0
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
    ];

  let puzzle = PUZZLES[1];

  let simulator: Simulator;
  let sTextarea: TextArea;
  let rTextarea: TextArea;

  let showBackFace = type === "full";
  let title = "";
  let backURL = "";

  let sequence: string[] = [];
  let sequenceIndex: number[] = [];
  let sequenceAlpha = 0;
  let playing = false;
  let initTime = 0;
  let finalTime = 0;
  let initAlpha = 0;
  let finalAlpha = 0;
  let speed = 1;
  let lastId = -1;
  let mounted = false;
  let limit = -1;
  let dir: 1 | -1 = 1;
  let drawerOpen = false;

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
      }
    }

    sequenceAlpha = minmax(a, initAlpha, finalAlpha);

    if (a < initAlpha || a > finalAlpha) {
      playing = false;
    }

    requestAnimationFrame(play);
  }

  function recomputeTimeBounds(s: number, inv = false) {
    let percent = (sequenceAlpha - initAlpha) / (finalAlpha - initAlpha);
    let total = (finalAlpha * 1000) / s;

    finalTime = performance.now() + total * (1 - (inv ? 1 - percent : percent));
    initTime = finalTime - total;
  }

  function handlePlay() {
    if (finalAlpha === 0) return;

    if (playing) {
      playing = false;
    } else {
      if (sequenceAlpha === finalAlpha) {
        sequenceAlpha = 0;
      }

      playing = true;
      limit = -1;
      dir = 1;
      recomputeTimeBounds(speed);
      play();
    }
  }

  function handleSequenceAlpha(a: number) {
    if (!mounted) return;

    let id = sequenceIndex[~~a];

    if (lastId != id && id >= initAlpha && id < finalAlpha) {
      if (type === "full") {
        let allMoves = rTextarea.getContentEdit().querySelectorAll(".move:not(.silent)");
        allMoves.forEach(mv => mv.classList.remove("current"));
        if (allMoves[id]) {
          allMoves[id].classList.add("current");
          drawerOpen && allMoves[id].scrollIntoView({ block: "nearest" });
        }
      }
      lastId = id;
    }
  }

  function pause() {
    playing = false;
  }

  function step(d: 1 | -1) {
    if (finalAlpha === 0) return;

    limit = d === 1 ? ~~sequenceAlpha + 1 : Math.ceil(sequenceAlpha) - 1;
    dir = d;
    recomputeTimeBounds(speed * 2, d === -1);
    playing = true;
    play();
  }

  function handleKeyup(ev: KeyboardEvent) {
    switch (ev.code) {
      case "KeyP": {
        if (ev.ctrlKey || ev.metaKey) {
          handlePlay();
        }
        break;
      }

      case "KeyB": {
        ev.ctrlKey && (showBackFace = !showBackFace);
        break;
      }

      // case "Comma": {
      //   ev.ctrlKey && ((recIndex -= 1), setRecIndex());
      //   break;
      // }

      // case "Period": {
      //   ev.ctrlKey && ((recIndex += 1), setRecIndex());
      //   break;
      // }

      case "ArrowLeft": {
        ev.ctrlKey && step(-1);
        break;
      }

      case "ArrowRight": {
        ev.ctrlKey && step(1);
        break;
      }
    }
  }

  function handleKeydown(ev: KeyboardEvent) {
    if (ev.code === "KeyP" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      return false;
    }
  }

  async function resetPuzzle() {
    await tick();
    simulator.handleSequence(sequence, scramble);
    sTextarea.updateInnerText();
    rTextarea.updateInnerText();
  }

  async function handleLocation(loc: any) {
    let map = new URL(loc.href).searchParams;
    let p = map.get("puzzle");
    let o = parseInt(map.get("order") || "-1");
    let s = map.get("scramble") || "";
    let r = map.get("reconstruction") || "";
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

      let rec = recs.find(rec => rec.id === id);

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
      if (recs[i].id != recIndex) continue;

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
    let rec1 = recs.find(r => r.id === recIndex) || recs[0];
    let rec = "";

    if (rec1.scramble === scramble && rec1.solution === reconstruction) {
      rec = `https://cubicdb.netlify.app/reconstructions?recIndex=${recIndex}`;
    } else {
      rec = `https://cubicdb.netlify.app/reconstructions?puzzle=${puzzle.puzzle}&order=${
        puzzle.order
      }&scramble=${encodeURIComponent(scramble)}&reconstruction=${encodeURIComponent(
        reconstruction
      )}`;
    }

    copyToClipboard(rec).then(() => {
      NotificationService.getInstance().addNotification({
        header: $localLang.global.done,
        text: $localLang.global.copiedToClipboard,
        timeout: 1000,
      });
    });
  }

  function handleControlled(type: PuzzleType, order: number) {
    let p = PUZZLES.find(pz => pz.puzzle === type && (pz.order === -1 || pz.order === order));

    if (!p) return;

    puzzle = p;
    scramble = scramble;
    parse(reconstruction, true);
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

  onMount(() => {
    mounted = true;
    // setRecIndex();

    // let elem = rTextarea.getTextArea();
    // let pre = rTextarea.getContentEdit();

    // elem.addEventListener("click", ev => handleTextareaClick(ev, elem, pre));
  });

  $: recomputeTimeBounds(speed);
  $: handleSequenceAlpha(sequenceAlpha);
  $: type === "full" && handleLocation($location);
  $: drawerOpen = !$screen.isMobile ? true : drawerOpen;
  $: type === "controlled" && handleControlled(puzzleType, ~~puzzleOrder);
</script>

<svelte:window on:keyup={handleKeyup} on:keydown={handleKeydown} />

<main class:full={type === "full"}>
  <section>
    <Simulator
      contained
      enableDrag={false}
      enableRotation={type === "full"}
      gui={false}
      {sequence}
      bind:selectedPuzzle={puzzle.puzzle}
      bind:order={puzzle.order}
      bind:this={simulator}
      bind:showBackFace
      bind:useScramble={scramble}
      bind:sequenceAlpha
      enableKeyboard={false}
      zoom={type === "full" ? 12 : 6}
    />

    <div
      class={"bg-backgroundLv2 absolute controls bottom-0 w-full " +
        (type === "full" ? "grid h-16" : "flex items-center h-0")}
    >
      <button class="flex px-3 py-2" on:mousedown={pause}>
        <Range
          bind:value={sequenceAlpha}
          min={initAlpha}
          max={finalAlpha}
          step="0.025"
          size={type === "full" ? "md" : "sm"}
        />
      </button>

      <div class="flex justify-evenly">
        {#if type === "full"}
          <Button
            color="none"
            class="w-full h-full rounded-none shadow-none hover:bg-purple-600"
            on:click={() => step(-1)}
          >
            <StepBackIcon size={iconSize} />
          </Button>

          <Tooltip placement="top" class="flex items-center justify-center gap-2">
            {$localLang.RECONSTRUCTIONS.stepBack}
            <span class="text-yellow-300 flex items-center gap-2">
              [Ctrl + <Kbd class="inline-flex items-center -ml-1 -mr-3 p-1 scale-75"
                ><ArrowKeyLeft /></Kbd
              >]
            </span>
          </Tooltip>
        {/if}

        <Button
          color="none"
          on:click={handlePlay}
          class={"w-full h-full rounded-none shadow-none hover:bg-green-600 " +
            (type === "full" ? "" : "!p-1 mr-1")}
        >
          {#if playing}
            <PauseIcon size={iconSize} />
          {:else if sequenceAlpha === finalAlpha}
            <RestartIcon size={iconSize} />
          {:else}
            <PlayIcon size={iconSize} />
          {/if}
        </Button>

        {#if type === "full"}
          <Tooltip placement="top" class="flex items-center justify-center gap-2">
            {$localLang.RECONSTRUCTIONS.playPause}
            <span class="text-yellow-300 flex items-center gap-2"> [Ctrl + P] </span>
          </Tooltip>
        {/if}

        {#if type === "full"}
          <Button
            color="none"
            class="w-full h-full rounded-none shadow-none hover:bg-purple-600"
            on:click={() => step(1)}
          >
            <StepForwardIcon size={iconSize} />
          </Button>
          <Tooltip placement="top" class="flex items-center justify-center gap-2">
            {$localLang.RECONSTRUCTIONS.stepForward}
            <span class="text-yellow-300 flex items-center gap-2">
              [Ctrl + <Kbd class="inline-flex items-center -ml-1 -mr-3 p-1 scale-75"
                ><ArrowKeyRight /></Kbd
              >]
            </span>
          </Tooltip>
        {/if}
      </div>
    </div>
  </section>

  {#if type === "full"}
    <section class="settings" class:open={drawerOpen}>
      <div class="content">
        <TextArea
          bind:value={title}
          placeholder={$localLang.RECONSTRUCTIONS.title}
          class="rounded-none border-none bg-gray-800 px-2 py-1 border-t border-t-blue-800 text-xl text-center"
        />

        <div>
          <h2>{$localLang.global.scramble}</h2>
          <TextArea
            bind:value={scramble}
            getInnerText={s => parse(s, false)}
            placeholder={$localLang.RECONSTRUCTIONS.scramble}
            class="bg-transparent rounded-none w-full border-none"
            cClass="h-[10vh]"
            bind:this={sTextarea}
          />
        </div>

        <div>
          <h2 class="flex items-center gap-2">
            {$localLang.global.reconstruction}
            <button on:click={copyReconstruction}><CopyIcon size={iconSize} /></button>
            <Tooltip>{$localLang.global.copy}</Tooltip>
          </h2>

          <TextArea
            class="rounded-none border-none absolute inset-0"
            placeholder={$localLang.RECONSTRUCTIONS.reconstruction}
            bind:value={reconstruction}
            cClass="h-[30vh]"
            getInnerText={s => parse(s, true)}
            bind:this={rTextarea}
          />
        </div>

        <div>
          <h2>{$localLang.global.settings}</h2>

          <ul class="setting-list no-grid p-2 gap-4 place-items-center">
            <li>
              <Checkbox
                label={$localLang.global.showBackFace + " [Ctrl + B]"}
                hasKeybinding
                bind:checked={showBackFace}
              />
            </li>
            <li>
              <Select
                bind:value={puzzle}
                items={PUZZLES}
                transform={e => e}
                label={e => e.name}
                onChange={resetPuzzle}
                hasIcon={e => e.scrambler}
              />
            </li>
            <li>
              <Button color="green" on:click={() => simulator.resetCamera()}>
                <RestartIcon size={iconSize} />
                {$localLang.RECONSTRUCTIONS.resetCamera}
              </Button>
            </li>
            <li>
              <Button color="purple" on:click={() => (showRecSearch = true)}>
                <SearchIcon size={iconSize} />
                {$localLang.RECONSTRUCTIONS.findReconstruction}
              </Button>
            </li>
            <li>
              <Button on:click={() => (scramble = reconstruction = title = "")}>
                {$localLang.global.reset}
              </Button>
            </li>

            {#if backURL}
              <li>
                <Button on:click={() => navigate(backURL)}>
                  <BackIcon size={iconSize} />
                  {$localLang.RECONSTRUCTIONS.return}
                </Button>
              </li>
            {/if}

            <li class="w-full flex flex-col">
              <span> {$localLang.RECONSTRUCTIONS.speed}: {Math.floor(speed * 10) / 10}x</span>
              <Range bind:value={speed} min={0.1} max={10} step="0.1" />
            </li>
          </ul>

          <div class="actions hidden justify-evenly">
            <Input type="number" class="max-w-[6rem]" bind:value={recIndex} min={0} />
            <Button
              on:click={() => {
                recIndex -= 1;
                setRecIndex();
              }}>&lt;</Button
            >
            <Button
              on:click={() => {
                recIndex += 1;
                setRecIndex();
              }}>&gt;</Button
            >
            <Button on:click={() => setRecIndex()}>Set</Button>
            <Button on:click={() => saveToIndex()}>Save</Button>
            <Button on:click={() => downloadRecs()}>Download</Button>
          </div>
        </div>
      </div>

      <Button
        color="none"
        class="max-md:absolute md:hidden left-0 top-1/2 -translate-x-full -translate-y-1/2 px-[0.3rem] py-8
      rounded-none rounded-tl-md rounded-bl-md bg-background border-2 border-primary-500 border-r-0"
        on:click={() => (drawerOpen = !drawerOpen)}
      >
        <ChevronLeft size="1.2rem" class={drawerOpen ? "rotate-180" : ""} />
      </Button>
    </section>
  {/if}
</main>

<Modal
  bind:open={showRecSearch}
  autoclose
  outsideclose
  size="sm"
  title={$localLang.RECONSTRUCTIONS.findReconstruction}
>
  <span class="text-yellow-500 my-2">eg. 3x3 Max Park</span>
  <Input bind:value={recSearch} />

  <ul
    class="mt-4 max-h-[10rem] overflow-x-clip overflow-y-scroll pr-4"
    style="scrollbar-gutter: stable;"
  >
    {#each findReconstructions(recSearch).slice(0, 500) as rec}
      <li>
        <button
          on:click={() => {
            recIndex = rec.id;
            setRecIndex();
            showRecSearch = false;
          }}
          class="cursor-pointer rounded-md p-1 hover:bg-blue-600 hover:text-white w-full transition-all duration-200"
        >
          {rec.title}
        </button>
      </li>
    {/each}
  </ul>
</Modal>

<style lang="postcss">
  main {
    @apply relative grid mt-1 w-full h-full overflow-hidden;
  }

  main.full {
    @apply md:grid-cols-2;
  }

  main:not(.full) {
    @apply border border-primary-900 rounded-md bg-backgroundLv1;
  }

  main:not(.full) .controls {
    @apply overflow-hidden;
  }

  main:not(.full):hover .controls {
    @apply h-8;
  }

  main section {
    @apply relative h-full;
  }

  main.full section {
    @apply h-[calc(100vh-3.5rem)];
  }

  .controls {
    @apply transition-all duration-200;
  }

  .settings {
    @apply border border-blue-800 flex flex-col relative;
  }

  .settings .content {
    @apply overflow-auto;
  }

  @media not all and (min-width: 768px) {
    .settings {
      @apply absolute w-[min(calc(100%-2rem),25rem)] right-0 bg-background transition-all duration-200;
    }

    .settings:not(.open) {
      transform: translateX(100%);
    }
  }

  .settings .content > div {
    @apply border-t border-t-blue-800;
  }

  .settings div h2 {
    @apply bg-gray-800 px-2 py-1 text-xl;
  }

  .setting-list {
    min-height: 4rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, max-content));
    justify-content: space-evenly;
    overflow: hidden;
  }

  .setting-list li {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    height: 100%;
    border-radius: 0.3rem;
    box-shadow: 0px 0px 0.3rem #fff3;
    padding: 0.3rem;
  }
</style>
