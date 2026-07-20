<script lang="ts">
  import moment from "moment";
  import {
    AverageSetting,
    Penalty,
    type ITimerController,
    type Solve,
    type TimerContext,
  } from "@interfaces";
  import { infinitePenalty, isMo3, sTimer, timer } from "@helpers/timer";
  import Modal from "@components/Modal.svelte";
  import TextArea from "@material/TextArea.svelte";

  import { pGenerateCubeBundle } from "@helpers/cube-draw";
  import { options } from "@cstimer/scramble/scramble";
  import { STEP_COLORS } from "@constants";
  import { Paginator } from "@classes/Paginator";

  import { getAverageS, solveSummary } from "@helpers/statistics";
  import { NotificationService } from "@stores/notification.service";

  import { localLang } from "@stores/language.service";
  import { tick } from "svelte";
  import {
    copyToClipboard,
    defaultInner,
    parseReconstruction,
    replaceParams,
  } from "@helpers/strings";
  import { calcPercents } from "@helpers/math";
  import { startViewTransition } from "@helpers/DOM";
  import { navigate } from "svelte-routing";
  import { Dropdown, DropdownItem, Spinner } from "$lib/cubicdbKit";
  import AdvancedSearch from "./components/AdvancedSearch/AdvancedSearch.svelte";
  import PaginatorComponent from "@components/PaginatorComponent.svelte";
  import { GateAdaptor } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors";
  import type { SearchFilter } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors/types";
  import { dataService } from "$lib/data-services/data.service";
  import { scrambleToPuzzle } from "@helpers/scrambleToPuzzle";
  import PuzzleImageBundle from "@components/PuzzleImageBundle.svelte";
  import Button from "$lib/cubicdbKit/Button.svelte";
  import Tooltip from "$lib/cubicdbKit/Tooltip.svelte";
  import { createEmptySolve } from "@helpers/object";
  import {
    CalendarIcon,
    ChevronDownIcon,
    CopyIcon,
    Dice3Icon,
    Dice5Icon,
    DicesIcon,
    FilterIcon,
    MessageSquarePlusIcon,
    MessageSquareTextIcon,
    PencilIcon,
    SaveIcon,
    Share2Icon,
    SquareDashedIcon,
    TrashIcon,
    XIcon,
    RouteIcon,
  } from "lucide-svelte";

  const notification = NotificationService.getInstance();

  interface HistoryTabProps {
    context: TimerContext;
    timerController: ITimerController;
  }

  let { context = $bindable(), timerController = $bindable() }: HistoryTabProps = $props();

  const { selected, requestUpdateSolve, requestRemoveSolves } = context;
  const { tab, solves, session } = timerController;

  let pg = $state(new Paginator([], 100));
  let LAST_CLICK = 0;

  // let modal: any;
  let deleteAllModal: any;
  let show = $state(false);
  let showDeleteSolve = $state(false);
  let showDeleteAll = $state(false);
  let sSolve: Solve = $state(createEmptySolve());
  let gSolve: Solve;
  let preview: string[] = $state([""]);
  let showContextMenu = $state(false);
  let contextMenuElement: HTMLUListElement;
  let solvesElement: HTMLDivElement;
  let pSolves: Solve[] = $state([]);
  let fSolves: Solve[] = [];
  let solveSteps: number[] = $state([]);
  let fComment = $state(false);
  let collapsed = $state(false);
  let reconstructionError = $state(true);
  let showDropdown = $state(false);
  let penaltyTriggerElement: HTMLDivElement;
  let solveEditTransitionNames = $state(createSolveEditTransitionNames());
  let searchModal = $state(false);
  let advancedSearchGate = $state(new GateAdaptor("and"));
  const advancedSearchFields: SearchFilter[] = [
    { field: "time", name: $localLang.global.time, type: "map", fn: t => timer(t, true) },
    { field: "date", name: $localLang.global.date, type: "date" },
    { field: "comments", name: $localLang.TIMER.comments, type: "string" },
  ];

  const PENALTIES = [
    { label: "+2", penalty: Penalty.P2 },
    { label: "DNF", penalty: Penalty.DNF },
    { label: "DNS", penalty: Penalty.DNS },
  ];

  function createSolveEditTransitionNames(solve?: Solve) {
    const id = solve?._id || Date.now();

    return {
      shell: `solve-edit-shell-${id}`,
      date: `solve-edit-date-${id}`,
      time: `solve-edit-time-${id}`,
    };
  }

  function closeHandler(s?: Solve) {
    preview = [""];

    if (s) {
      const comments = (s.comments ?? "").trim();
      s.comments = comments;
      gSolve.comments = comments;
      gSolve.penalty = s.penalty;
      requestUpdateSolve(s);
    }
    show = false;
  }

  function closeDetailsWithoutSaving() {
    closeHandler();
  }

  function createEditableSolve(solve: Solve): Solve {
    return {
      ...solve,
      comments: solve.comments ?? "",
    };
  }

  export function editSolve(s: Solve) {
    gSolve = s;
    sSolve = createEditableSolve(s);

    if (sSolve.steps && isMultiStepSession()) {
      solveSteps = calcPercents(sSolve.steps, sSolve.time);
    } else {
      solveSteps = [];
    }

    let sMode = sSolve.mode as string;
    let md = options.has(sMode) ? sMode : "333";

    let cubes = scrambleToPuzzle(sSolve.scramble, md);

    pGenerateCubeBundle(cubes, 400).then(res => {
      preview = res;
    });

    show = true;
  }

  function selectSolve(s: Solve) {
    s.selected = !s.selected;
    $selected += s.selected ? 1 : -1;
  }

  function handleClick(s: Solve, ev: MouseEvent) {
    const transitionTarget = ev.currentTarget as HTMLButtonElement;

    if (performance.now() - LAST_CLICK < 200 || $selected) {
      selectSolve(s);
    } else {
      setTimeout(() => {
        if (performance.now() - LAST_CLICK >= 200) {
          if (!transitionTarget.isConnected) {
            editSolve(s);
            return;
          }

          const transitionNames = createSolveEditTransitionNames(s);
          const dateTarget = transitionTarget.querySelector<HTMLElement>(".solve-row-date");
          const timeTarget = transitionTarget.querySelector<HTMLElement>(".solve-row-time");

          solveEditTransitionNames = transitionNames;
          transitionTarget.style.viewTransitionName = transitionNames.shell;
          if (dateTarget) dateTarget.style.viewTransitionName = transitionNames.date;
          if (timeTarget) timeTarget.style.viewTransitionName = transitionNames.time;

          startViewTransition(async () => {
            transitionTarget.style.viewTransitionName = "none";
            if (dateTarget) dateTarget.style.viewTransitionName = "none";
            if (timeTarget) timeTarget.style.viewTransitionName = "none";
            editSolve(s);
          });
        }
      }, 200);
    }

    LAST_CLICK = performance.now();
  }

  function setPenalty(p: Penalty, update?: boolean) {
    if (!sSolve) return;

    if (p === Penalty.P2) {
      sSolve.penalty != Penalty.P2 && (sSolve.time += 2000);
    } else if (sSolve.penalty === Penalty.P2) {
      sSolve.time -= 2000;
    }
    sSolve.penalty = p;

    if (update) {
      requestUpdateSolve(sSolve);
    }

    showDropdown = false;
  }

  function deleteAll() {
    showDeleteAll = true;
  }

  function selectAll() {
    $selected = $solves.length;
    for (let i = 0, maxi = $selected; i < maxi; i += 1) {
      $solves[i].selected = true;
    }
  }

  function selectInvert() {
    $selected = $solves.length - $selected;
    for (let i = 0, maxi = $solves.length; i < maxi; i += 1) {
      $solves[i].selected = !$solves[i].selected;
    }
  }

  function selectInterval() {
    let i1, i2;
    let len = $solves.length;

    for (i1 = 0; i1 < len && !$solves[i1].selected; i1 += 1);
    for (i2 = len - 1; i2 >= 0 && !$solves[i2].selected; i2 -= 1);

    for (let i = i1; i <= i2; i += 1) {
      if (!$solves[i].selected) {
        $solves[i].selected = true;
        $selected += 1;
      }
    }
  }

  function selectNone() {
    $selected = 0;
    pSolves.forEach(s => (s.selected = false));

    let sv = $solves;
    for (let i = 0, maxi = sv.length; i < maxi; i += 1) {
      sv[i].selected = false;
    }
  }

  function _delete(s: Solve[]) {
    requestRemoveSolves(s);
  }

  function requestDeleteSolve(s: Solve) {
    sSolve = s;
    showDeleteSolve = true;
    showContextMenu = false;
  }

  function confirmDeleteSolve(confirmed: boolean) {
    if (!confirmed) return;
    _delete([sSolve]);
    showDeleteSolve = false;
    closeHandler();
  }

  function deleteSelected() {
    _delete($solves.filter(s => s.selected));
    $selected = 0;
  }

  function handleKeydown(e: KeyboardEvent) {
    if ($tab != 1) return;

    switch (e.code) {
      case "Escape":
        selectNone();
        showContextMenu = false;
        break;
      case "KeyA":
        !show && selectAll();
        break;
      case "KeyT":
        !show && selectInterval();
        break;
      case "KeyV":
        !show && selectInvert();
        break;
      case "KeyD":
        !show && ($selected ? deleteSelected() : deleteAll());
        break;
      case "KeyF":
        e.ctrlKey && !show && !searchModal && (searchModal = true);
        break;
      case "Enter":
        showDeleteAll && deleteAllModal.close(true);
    }
  }

  function updateSolves() {
    pSolves = fSolves.slice(pg.start, pg.end);
  }

  function updatePaginator(s: any) {
    fSolves = $solves.filter(sv => advancedSearchGate.computeValue(sv));
    pg.setData(fSolves);

    updateSolves();
  }

  function toClipboard(text: string) {
    copyToClipboard(text.replaceAll("<br>", "\n")).then(() => {
      notification.addNotification({
        header: $localLang.global.done,
        text: $localLang.global.copiedToClipboard,
        timeout: 1000,
      });
    });
  }

  function shareAoX(n: number) {
    let sv = $solves.slice(0, n).reverse();
    let Ao5 = getAverageS(n, sv, AverageSetting.SEQUENTIAL);
    let minTime = (a: Solve, b: Solve) => {
      if (infinitePenalty(a)) return b;
      if (infinitePenalty(b)) return a;
      return a.time < b.time ? a : b;
    };

    let minMax = sv.reduce(
      (acc, s) => [minTime(acc[0], s) === s ? s : acc[0], minTime(acc[1], s) === s ? acc[1] : s],
      [sv[0], sv[0]]
    );

    if (Ao5.length === n) {
      toClipboard(
        `Ao${n}: ${timer(Ao5[n - 1] as any, true)} = ${sv
          .map(s =>
            s === minMax[0] || s === minMax[1] ? "(" + sTimer(s, true) + ")" : sTimer(s, true)
          )
          .join(", ")}`
      );
    }
  }

  function deleteAllHandler(all: boolean) {
    all && _delete($solves);
  }

  function handleContextMenu(e: MouseEvent, s: Solve) {
    e.stopPropagation();
    e.preventDefault();

    const dims = contextMenuElement.getBoundingClientRect();
    const zoom = $dataService.config.global.zoomFactor / 100;
    const footerHeight = 2.5 * 16 * zoom;
    const sideSpace = 2.5 * 16 * zoom;
    const avalHeight = document.body.clientHeight - footerHeight;
    const avalWidth = document.body.clientWidth - sideSpace;

    contextMenuElement.style.left = Math.min(e.clientX, avalWidth - dims.width) + "px";
    contextMenuElement.style.top = Math.min(e.clientY, avalHeight - dims.height) + "px";

    sSolve = s;

    if (sSolve.steps && isMultiStepSession()) {
      solveSteps = calcPercents(sSolve.steps, sSolve.time);
    } else {
      solveSteps = [];
    }

    showContextMenu = true;
  }

  function updatePageFromSelected() {
    if ($selected) {
      let sv = fSolves;

      for (let i = 0, maxi = sv.length; i < maxi; i += 1) {
        if (sv[i].selected) {
          let page = Math.ceil((i + 1) / pg.limit);
          pg.setPage(page);
          updateSolves();
          tick().then(() => {
            solvesElement.children[i - pg.start].scrollIntoView({ block: "center" });
          });
          break;
        }
      }
    }
  }

  function globalHandleClick(ev: MouseEvent) {
    showContextMenu = false;
  }

  function checkReconstruction() {
    let o = options.get(sSolve?.mode || "333")!;

    if (o && !Array.isArray(o)) {
      let params = [
        ["puzzle", o.type],
        ["order", o.order ? o.order[0] : -1],
        ["scramble", sSolve?.scramble || ""],
        ["reconstruction", sSolve?.comments || ""],
        ["returnTo", "/timer"],
      ];

      navigate("/reconstructions?" + params.map(p => encodeURI(p[0] + "=" + p[1])).join("&"));
    }
  }

  function parse(s: string) {
    let o = options.get(sSolve?.mode || "333");

    reconstructionError = true;

    if (o && !Array.isArray(o)) {
      let res = parseReconstruction(s, o.type, o.order ? o.order[0] : -1);
      reconstructionError = res.hasError || res.finalAlpha === 0;
      return res.hasError ? defaultInner(s, true) : res.result;
    }

    return defaultInner(s, true);
  }

  function isMultiStepSession() {
    return $session?.settings.sessionType === "multi-step";
  }

  async function focusTextArea(f: boolean) {
    setTimeout(() => (fComment = f), 100);
  }

  function solveIndex(sv: Solve) {
    if (!sv) return -1;

    for (let i = 0, maxi = $solves.length; i < maxi; i += 1) {
      if ($solves[i]._id === sv._id) {
        return maxi - i;
      }
    }

    return -1;
  }

  function copyAverage(sv: Solve, n: number) {
    let idx = $solves.length - solveIndex(sv);
    let arr = $solves.slice(idx, idx + n);

    copyToClipboard(solveSummary(arr)).then(() => {
      notification.addNotification({
        header: $localLang.global.done,
        text: $localLang.global.copiedToClipboard,
        timeout: 1000,
      });
    });
  }

  $effect(() => updatePaginator($solves));
  $effect(() => updatePageFromSelected());
  $effect(() => {
    if ($tab != 1 && $selected) selectNone();
  });
</script>

<svelte:window onkeydown={handleKeydown} onclick={globalHandleClick} />

<section
  role="tabpanel"
  class={"relative flex flex-col min-h-0 overflow-hidden w-full h-full " + ($tab != 1 ? "!hidden" : "")}
>
  <!-- Pagination -->
  <PaginatorComponent {pg} onupdate={updateSolves} />

  <!-- Solves -->
  <div id="grid" class="pt-4 grid min-h-0 flex-1 overflow-auto" bind:this={solvesElement}>
    {#each pSolves as solve (solve._id)}
      {@const stime = sTimer(solve, true)}
      <button
        class="shadow-md w-full h-full rounded-md p-1 bg-base-200 relative
          flex items-center justify-center transition-all duration-200 select-none cursor-pointer
          border border-primary/50
          hover:shadow-lg hover:shadow-primary/25 hover:bg-primary hover:text-primary-content
        "
        onclick={ev => handleClick(solve, ev)}
        oncontextmenu={e => handleContextMenu(e, solve)}
        class:selected={solve.selected}
      >
        <div
          class="solve-row-date pointer-events-none font-small absolute top-0 left-2"
        >
          {moment(solve.date).format("DD/MM")}
        </div>
        <span
          class={"solve-row-time pointer-events-none time text-center font-bold " +
            (stime === "DNF" ? "text-error font-bold" : "")}
        >
          {stime}
        </span>

        <div
          class="pointer-events-none absolute right-1 top-0 h-full flex flex-col items-center justify-evenly"
        >
          {#if solve.penalty === Penalty.P2}
            <span class="font-small text-error font-bold">+2</span>
          {/if}
          {#if solve.comments}
            <MessageSquarePlusIcon size="1rem" />
          {/if}
        </div>
      </button>
    {/each}
  </div>

  <!-- Options -->
  <div class="absolute top-3 right-2 my-3 mx-1 flex flex-col gap-2">
    {#if $solves.length > 0}
      <Tooltip tooltipText={$localLang.TIMER.deleteAll} placement="left" keyBindings={["d"]}>
        <button onclick={deleteAll} class="cursor-pointer grid place-items-center">
          <TrashIcon size="1.2rem" />
        </button>
      </Tooltip>
    {/if}

    <Tooltip tooltipText={$localLang.TIMER.shareAo5} placement="left">
      <button onclick={() => shareAoX(5)} class="cursor-pointer grid place-items-center">
        <Share2Icon size="1.2rem" />
      </button>
    </Tooltip>

    <Tooltip tooltipText={$localLang.TIMER.shareAo12} placement="left">
      <button onclick={() => shareAoX(12)} class="cursor-pointer grid place-items-center">
        <Share2Icon size="1.2rem" />
      </button>
    </Tooltip>

    <Tooltip tooltipText={$localLang.global.filter} placement="left">
      <button
        onclick={() => (searchModal = true)}
        class="cursor-pointer grid place-items-center relative"
      >
        <FilterIcon size="1.2rem" />
      </button>
    </Tooltip>
  </div>

  <!-- Solve Actions -->
  <div
    class:isVisible={$selected}
    class="fixed rounded-md p-2 top-0 opacity-0 transition-all duration-300 shadow-md shadow-base-100
      pointer-events-none flex flex-wrap max-w-full justify-evenly actions bg-base-200 z-20"
  >
    <Button aria-label={$localLang.TIMER.selectAll} onclick={() => selectAll()}>
      {$localLang.TIMER.selectAll} &nbsp; <span class="kbd kbd-sm">A</span>
    </Button>

    <Button aria-label={$localLang.TIMER.selectInterval} onclick={() => selectInterval()}>
      {$localLang.TIMER.selectInterval} &nbsp; <span class="kbd kbd-sm">T</span>
    </Button>

    <Button aria-label={$localLang.TIMER.invertSelection} onclick={() => selectInvert()}>
      {$localLang.TIMER.invertSelection} &nbsp;
      <span class="kbd kbd-sm">V</span>
    </Button>

    <Button aria-label={$localLang.global.cancel} onclick={() => selectNone()}>
      {$localLang.global.cancel} &nbsp; <span class="kbd kbd-sm">Esc</span>
    </Button>

    <Button aria-label={$localLang.global.delete} onclick={() => deleteSelected()}>
      {$localLang.global.delete} &nbsp; <span class="kbd kbd-sm">D</span>
    </Button>
  </div>

  <!-- Context Menu -->
  <ul
    class="context-menu w-max p-2 rounded-md shadow-md fixed top-8 left-28 bg-base-100
    grid gap-1 pointer-events-none opacity-0 invisible"
    class:active={showContextMenu}
    bind:this={contextMenuElement}
  >
    <li>
      <button onclick={() => editSolve(sSolve)}>
        <PencilIcon size="1.2rem" />
        {$localLang.TIMER.edit}
      </button>
    </li>
    <li>
      <button onclick={() => selectSolve(sSolve)}>
        <SquareDashedIcon size="1.2rem" />
        {$localLang.TIMER.select}
      </button>
    </li>
    <li>
      <button onclick={() => toClipboard(sSolve.scramble)}>
        <CopyIcon size="1.2rem" />
        {$localLang.TIMER.copyScramble}
      </button>
    </li>
    {#if solveIndex(sSolve) >= (isMo3($session?.settings.mode || "") ? 3 : 5)}
      <li>
        <button onclick={() => copyAverage(sSolve, isMo3($session?.settings.mode || "") ? 3 : 5)}>
          {#if isMo3($session?.settings.mode || "")}
            <Dice3Icon size="1.2rem" /> {$localLang.global.copy} Mo3
          {:else}
            <Dice5Icon size="1.2rem" /> {$localLang.global.copy} Ao5
          {/if}
        </button>
      </li>
    {/if}

    {#if solveIndex(sSolve) >= 12}
      <li>
        <button onclick={() => copyAverage(sSolve, 12)}>
          <DicesIcon size="1.2rem" />
          {$localLang.global.copy} Ao12
        </button>
      </li>
    {/if}
    <li>
      <button onclick={() => requestDeleteSolve(sSolve)}>
        <TrashIcon size="1.2rem" />
        {$localLang.global.delete}
      </button>
    </li>
  </ul>
</section>

<Modal
  bind:show
  onclose={closeHandler}
  title={$localLang.TIMER.edit}
  showCloseButton
  closeOnClickOutside
  size="2xl"
  class="w-[min(100%,40rem)] shaded-card"
  transitionName={solveEditTransitionNames.shell}
>
  <div class="flex justify-between items-center m-2">
    <span
      class="view-time m-1 w-max text-lg font-bold"
      style:view-transition-name={solveEditTransitionNames.time}
    >
      {#if sSolve.penalty === Penalty.NONE || sSolve.penalty === Penalty.P2}
        {sTimer(sSolve, true, true)}
      {/if}
      {#if sSolve.penalty === Penalty.P2}
        <span class="font-small text-red-500">+2</span>
      {/if}
      {#if sSolve.penalty === Penalty.DNF}
        <span class="font-small text-red-500">DNF</span>
      {/if}
      {#if sSolve.penalty === Penalty.DNS}
        <span class="font-small text-red-500">DNS</span>
      {/if}
    </span>
    <span class="flex items-center font-small">
      <CalendarIcon size="1.2rem" />
      <span class="ml-2" style:view-transition-name={solveEditTransitionNames.date}>
        {moment(sSolve?.date).format("D MMM YYYY")} <br />
        {moment(sSolve?.date).format("HH:MM")}
      </span>
    </span>
  </div>
  <div
    class={"algorithm-container m-2 transition-all duration-300 delay-100 " +
      (fComment || collapsed ? "collapsed" : "")}
  >
    <Dice5Icon size="1.2rem" />

    <pre
      contenteditable="false"
      class="text-center text-sm break-words whitespace-normal overflow-auto max-h-[20svh]">
        {@html sSolve?.scramble?.replaceAll("\n", "<br>") || ""}
      </pre>

    <div
      class="preview col-span-2 mx-auto overflow-hidden w-full h-full
        flex items-center justify-center relative px-1 max-h-[30vh]"
    >
      {#if preview}
        <PuzzleImageBundle
          src={preview}
          allowDownload
        />
      {:else}
        <Spinner size="20" />
      {/if}
    </div>

    {#if isMultiStepSession() && sSolve?.steps?.length}
      <hr class="w-full border border-t-gray-400 col-span-2" />
      <h3 class="text-center col-span-2 mt-2 mb-8 text-lg">
        {$localLang.global.steps}
      </h3>

      <div class="col-span-2 flex mb-4">
        {#each solveSteps as s, p (p)}
          <span
            class="step-part"
            data-percent={`${s}%`}
            data-time={timer((sSolve.steps || [])[p], true, true)}
            style={`
                width: ${s}%;
                background-color: ${STEP_COLORS[p]};
                --p: ${p};
              `}
          ></span>
        {/each}
      </div>

      <div class="col-span-2 flex mb-4 text-center -mt-4">
        {#each solveSteps as s, p (p)}
          <span style={`width: ${s}%; `}>{($session?.settings.stepNames || [])[p] || ""}</span>
        {/each}
      </div>
    {/if}

    <MessageSquareTextIcon size="1.2rem" />

    <TextArea
      blurOnEscape
      onfocus={() => focusTextArea(true)}
      onblur={() => focusTextArea(false)}
      cClass={fComment ? "max-h-[30ch]" : "max-h-[20ch]"}
      getInnerText={parse}
      class="border border-gray-400 text-sm"
      bind:value={sSolve.comments}
      placeholder={$localLang.TIMER.comment}
    />
  </div>
  <div class="mt-2 flex flex-wrap justify-evenly gap-1">
    <Button
      aria-label={$localLang.global.delete}
      type="danger"
      onclick={() => (showDeleteSolve = true)}
    >
      <TrashIcon size="1.2rem" />
      {$localLang.global.delete}
    </Button>

    <Button
      aria-label={$localLang.global.cancel}
      type="secondary"
      onclick={closeDetailsWithoutSaving}
    >
      <XIcon size="1.2rem" />
      {$localLang.global.cancel}
    </Button>

    <Button
      aria-label={$localLang.global.save}
      onclick={() => {
        closeHandler(sSolve);
      }}
      class="mr-2 text-sm gap-1 px-2"
    >
      <SaveIcon size="1.2rem" />
      {$localLang.global.save}
    </Button>

    {#if !reconstructionError}
      <Tooltip tooltipText={$localLang.global.reconstruction}>
        <Button
          aria-label={$localLang.global.reconstruction}
          onclick={checkReconstruction}
          type="success"
          size="sm"
          icon
        >
          <RouteIcon size="1.2rem" />
        </Button>
      </Tooltip>
    {/if}

    <div class="relative" bind:this={penaltyTriggerElement}>
      <Button>
        {[{ label: $localLang.TIMER.noPenalty, penalty: Penalty.NONE }, ...PENALTIES].find(
          p => p.penalty === sSolve.penalty
        )?.label || $localLang.TIMER.noPenalty}

        <ChevronDownIcon size="1.2rem" />
      </Button>
      <Dropdown
        trigger={penaltyTriggerElement}
        bind:open={showDropdown}
        class="bg-base-200 text-base-content rounded-md"
      >
        {#each [{ label: $localLang.TIMER.noPenalty, penalty: Penalty.NONE }, ...PENALTIES] as p}
          <DropdownItem class="bg-base-200 hover:bg-base-300" onclick={() => setPenalty(p.penalty)}>
            {p.label}
          </DropdownItem>
        {/each}
      </Dropdown>
    </div>
  </div>
</Modal>

<Modal
  class="shaded-card"
  bind:show={showDeleteSolve}
  title={$localLang.global.delete}
  showCloseButton
  closeOnClickOutside
  onclose={confirmDeleteSolve}
>
  <h1 class="mb-4 text-lg">
    {replaceParams($localLang.global.deleteWarning, [sTimer(sSolve, true)])}
  </h1>
  <div class="flex justify-center gap-2">
    <Button
      type="secondary"
      aria-label={$localLang.global.cancel}
      onclick={() => (showDeleteSolve = false)}
    >
      {$localLang.global.cancel}
    </Button>

    <Button
      type="danger"
      aria-label={$localLang.global.delete}
      onclick={() => confirmDeleteSolve(true)}
    >
      {$localLang.global.delete}
    </Button>
  </div>
</Modal>

<Modal
  class="shaded-card"
  bind:this={deleteAllModal}
  bind:show={showDeleteAll}
  onclose={deleteAllHandler}
>
  <h1 class="mb-4 text-lg">{$localLang.TIMER.removeAllSolves}</h1>
  <div class="flex justify-center gap-2">
    <Button
      type="secondary"
      aria-label={$localLang.global.cancel}
      onclick={() => deleteAllModal.close()}
    >
      {$localLang.global.cancel}
    </Button>

    <Button
      type="danger"
      aria-label={$localLang.global.delete}
      onclick={() => deleteAllModal.close(true)}
    >
      {$localLang.global.delete}
    </Button>
  </div>
</Modal>

<Modal bind:show={searchModal} class="max-w-xl w-full shaded-card">
  <AdvancedSearch
    fields={advancedSearchFields}
    bind:gate={advancedSearchGate}
    onclose={() => (searchModal = false)}
    onapply={updatePaginator}
  />
</Modal>

<style lang="postcss">
  @reference "@src/themes/index.css";

  section {
    grid-area: tabs;
  }

  #grid {
    grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
    grid-auto-rows: 3rem;
    gap: 0.5rem;
    padding-bottom: 2rem;
    padding-right: 0.5rem;
    margin-right: 2.5rem;
  }

  .font-small {
    font-size: 0.7rem;
  }

  .algorithm-container {
    display: grid;
    grid-template-columns: 1.3rem 1fr;
    grid-template-rows: auto 1fr auto auto auto;
  }

  .algorithm-container.collapsed {
    grid-template-rows: auto 0.5fr auto auto auto;
  }

  .actions {
    left: 50%;
    transform: translateX(-50%);
    width: min(100%, 40rem);
  }

  .selected {
    @apply bg-warning text-primary-content hover:shadow-warning;
  }

  .isVisible {
    @apply top-4 z-50 opacity-100 pointer-events-auto;
  }

  .context-menu.active {
    @apply pointer-events-auto opacity-100 visible;
  }

  .context-menu li {
    @apply pointer-events-none;
  }

  .context-menu li button {
    @apply pointer-events-auto pr-2 hover:pl-2 hover:pr-1 p-1 rounded-md transition-all duration-200
    hover:bg-white/10 w-full flex gap-2 justify-start items-center;
  }

  .step-part {
    height: 1.8rem;
    display: flex;
    position: relative;
  }

  .step-part:first-child {
    @apply rounded-l-full;
  }

  .step-part:last-child {
    @apply rounded-r-full;
  }

  .step-part::before {
    content: attr(data-percent);
    position: absolute;
    left: 50%;
    transform: translate(-50%, -1.5rem);
  }

  .step-part::after {
    content: attr(data-time);
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: black;
    font-size: 0.8rem;
  }

</style>
