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

  import { genImages } from "cubicdb-module";
  import { options } from "@cstimer/scramble/scramble";
  import { Paginator } from "@classes/Paginator";

  import { getAverageS, solveSummary } from "@helpers/statistics";
  import { NotificationService } from "@stores/notification.service";

  import { localLang } from "@stores/language.service";
  import { tick } from "svelte";
  import { defaultInner, parseReconstruction, replaceParams } from "@helpers/strings";
  import { copyTextToClipboard } from "@helpers/clipboard";
  import { calcPercents } from "@helpers/math";
  import { startViewTransition } from "@helpers/DOM";
  import { navigate } from "svelte-routing";
  import ConfirmationModal from "@components/ConfirmationModal.svelte";
  import AdvancedSearchModal from "./components/AdvancedSearchModal.svelte";
  import SolveDetailsModal from "./components/SolveDetailsModal.svelte";
  import SolveGrid from "./components/SolveGrid.svelte";
  import PaginatorComponent from "@components/PaginatorComponent.svelte";
  import { GateAdaptor } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors";
  import type { SearchFilter } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors/types";
  import { dataService } from "$lib/data-services/data.service";
  import Button from "$lib/cubicdbKit/Button.svelte";
  import Tooltip from "$lib/cubicdbKit/Tooltip.svelte";
  import { useSolve } from "$lib/timer/solves";
  import { createEmptySolve } from "@helpers/object";
  import {
    CopyIcon,
    Dice3Icon,
    Dice5Icon,
    DicesIcon,
    FilterIcon,
    PencilIcon,
    Share2Icon,
    SquareDashedIcon,
    TrashIcon,
  } from "lucide-svelte";

  const notification = NotificationService.getInstance();

  interface HistoryTabProps {
    context: TimerContext;
    timerController: ITimerController;
  }

  let { context = $bindable(), timerController = $bindable() }: HistoryTabProps = $props();

  const { tab, session } = timerController;
  const solveFeature = useSolve(() => $session?._id ?? "");

  let pg = $state(new Paginator([], 100));
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
  let reconstructionError = $state(true);
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
  const HISTORY_ACTION_SHORTCUT_CLASS =
    "kbd kbd-sm border-warning bg-warning text-xs font-bold text-warning-content shadow-sm";

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
      void solveFeature.update(s);
    }
    show = false;
  }

  function createEditableSolve(solve: Solve): Solve {
    return {
      ...solve,
      comments: solve.comments ?? "",
    };
  }

  function generateSolvePreview(solve: Solve) {
    const sMode = solve.mode as string;
    const md = options.has(sMode) ? sMode : "333";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (sSolve?._id === solve._id) {
          preview = genImages([{ scramble: solve.scramble, type: md as any }]);
        }
      });
    });
  }

  export function editSolve(s: Solve) {
    gSolve = s;
    sSolve = createEditableSolve(s);
    preview = [""];

    if (sSolve.steps && isMultiStepSession()) {
      solveSteps = calcPercents(sSolve.steps, sSolve.time);
    } else {
      solveSteps = [];
    }

    show = true;
    generateSolvePreview(sSolve);
  }

  function selectSolve(s: Solve) {
    solveFeature.toggleSelected(s);
  }

  function openSolveDetails(s: Solve, transitionTarget: HTMLButtonElement) {
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
      await tick();
    });
  }

  function handleSolveOpen(s: Solve, transitionTarget: HTMLButtonElement) {
    if (solveFeature.selectedCount) {
      selectSolve(s);
      return;
    }

    openSolveDetails(s, transitionTarget);
  }

  function setPenalty(p: Penalty) {
    if (!sSolve) return;

    if (p === Penalty.P2) {
      sSolve.penalty != Penalty.P2 && (sSolve.time += 2000);
    } else if (sSolve.penalty === Penalty.P2) {
      sSolve.time -= 2000;
    }
    sSolve.penalty = p;
  }

  function deleteAll() {
    showDeleteAll = true;
  }

  function selectAll() {
    solveFeature.selectAll(fSolves);
  }

  function selectInvert() {
    solveFeature.invertSelection(fSolves);
  }

  function selectInterval() {
    solveFeature.selectInterval(fSolves);
  }

  function selectNone() {
    solveFeature.clearSelection();
  }

  function requestDeleteSolve(s: Solve) {
    sSolve = s;
    showDeleteSolve = true;
    showContextMenu = false;
  }

  function confirmDeleteSolve() {
    void solveFeature.remove([sSolve]);
    showDeleteSolve = false;
    closeHandler();
  }

  function deleteSelected() {
    void solveFeature.removeSelected();
  }

  function confirmDeleteAll() {
    showDeleteAll = false;
    void solveFeature.remove(solveFeature.solves);
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
        !show && (solveFeature.selectedCount ? deleteSelected() : deleteAll());
        break;
      case "KeyF":
        e.ctrlKey && !show && !searchModal && (searchModal = true);
        break;
      case "Enter":
        showDeleteAll && confirmDeleteAll();
    }
  }

  function updateSolves() {
    pSolves = fSolves.slice(pg.start, pg.end);
  }

  function updatePaginator() {
    fSolves = solveFeature.solves.filter(sv => advancedSearchGate.computeValue(sv));
    pg.setData(fSolves);

    updateSolves();
  }

  function notifyCopiedToClipboard() {
    notification.addNotification({
      header: $localLang.global.done,
      text: $localLang.global.copiedToClipboard,
      timeout: 1000,
    });
  }

  function copyHistoryText(text: string) {
    copyTextToClipboard(text, { normalizeHtmlBreaks: true }).then(notifyCopiedToClipboard);
  }

  function shareAoX(n: number) {
    let sv = solveFeature.solves.slice(0, n).reverse();
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
      copyHistoryText(
        `Ao${n}: ${timer(Ao5[n - 1] as any, true)} = ${sv
          .map(s =>
            s === minMax[0] || s === minMax[1] ? "(" + sTimer(s, true) + ")" : sTimer(s, true)
          )
          .join(", ")}`
      );
    }
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
    if (solveFeature.selectedCount) {
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

  function solveIndex(sv: Solve) {
    if (!sv) return -1;

    for (let i = 0, maxi = solveFeature.solves.length; i < maxi; i += 1) {
      if (solveFeature.solves[i]._id === sv._id) {
        return maxi - i;
      }
    }

    return -1;
  }

  function copyAverage(sv: Solve, n: number) {
    let idx = solveFeature.solves.length - solveIndex(sv);
    let arr = solveFeature.solves.slice(idx, idx + n);

    copyTextToClipboard(solveSummary(arr)).then(notifyCopiedToClipboard);
  }

  $effect(() => updatePaginator());
  $effect(() => updatePageFromSelected());
  $effect(() => {
    if ($tab != 1 && solveFeature.selectedCount) selectNone();
  });
</script>

<svelte:window onkeydown={handleKeydown} onclick={globalHandleClick} />

<section
  role="tabpanel"
  class={"relative flex flex-col min-h-0 overflow-hidden w-full h-full " +
    ($tab != 1 ? "hidden!" : "")}
>
  <!-- Pagination -->
  <PaginatorComponent {pg} onupdate={updateSolves} />

  <!-- Solves -->
  <SolveGrid
    solves={pSolves}
    onOpen={handleSolveOpen}
    onContextMenu={handleContextMenu}
    onGridElement={element => (solvesElement = element)}
  />

  <!-- Options -->
  <div class="absolute top-3 right-2 my-3 mx-1 flex flex-col gap-2">
    {#if solveFeature.solves.length > 0}
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
    class:isVisible={solveFeature.selectedCount}
    class="fixed rounded-md p-2 top-0 opacity-0 transition-all duration-300 shadow-md shadow-base-100
      pointer-events-none flex flex-wrap max-w-full justify-evenly actions bg-base-200 z-20"
  >
    <Button aria-label={$localLang.TIMER.selectAll} onclick={() => selectAll()}>
      {$localLang.TIMER.selectAll} &nbsp; <span class={HISTORY_ACTION_SHORTCUT_CLASS}>A</span>
    </Button>

    <Button aria-label={$localLang.TIMER.selectInterval} onclick={() => selectInterval()}>
      {$localLang.TIMER.selectInterval} &nbsp;
      <span class={HISTORY_ACTION_SHORTCUT_CLASS}>T</span>
    </Button>

    <Button aria-label={$localLang.TIMER.invertSelection} onclick={() => selectInvert()}>
      {$localLang.TIMER.invertSelection} &nbsp;
      <span class={HISTORY_ACTION_SHORTCUT_CLASS}>V</span>
    </Button>

    <Button aria-label={$localLang.global.cancel} onclick={() => selectNone()}>
      {$localLang.global.cancel} &nbsp; <span class={HISTORY_ACTION_SHORTCUT_CLASS}>Esc</span>
    </Button>

    <Button aria-label={$localLang.global.delete} onclick={() => deleteSelected()}>
      {$localLang.global.delete} &nbsp; <span class={HISTORY_ACTION_SHORTCUT_CLASS}>D</span>
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
      <button onclick={() => copyHistoryText(sSolve.scramble)}>
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

<SolveDetailsModal
  bind:show
  bind:solve={sSolve}
  {preview}
  {solveSteps}
  stepNames={$session?.settings.stepNames || []}
  isMultiStepSession={isMultiStepSession()}
  {reconstructionError}
  penalties={PENALTIES}
  transitionNames={solveEditTransitionNames}
  onclose={closeHandler}
  ondelete={() => (showDeleteSolve = true)}
  oncheckReconstruction={checkReconstruction}
  onparse={parse}
  onsetPenalty={setPenalty}
/>

<ConfirmationModal
  bind:show={showDeleteSolve}
  title={$localLang.global.delete}
  message={replaceParams($localLang.global.deleteWarning, [sTimer(sSolve, true)])}
  cancelLabel={$localLang.global.cancel}
  confirmLabel={$localLang.global.delete}
  onconfirm={confirmDeleteSolve}
/>

<ConfirmationModal
  bind:show={showDeleteAll}
  message={$localLang.TIMER.removeAllSolves}
  cancelLabel={$localLang.global.cancel}
  confirmLabel={$localLang.global.delete}
  onconfirm={confirmDeleteAll}
/>

<AdvancedSearchModal
  bind:show={searchModal}
  fields={advancedSearchFields}
  bind:gate={advancedSearchGate}
  onapply={updatePaginator}
/>

<style lang="postcss">
  @reference "@src/themes/index.css";

  section {
    grid-area: tabs;
  }

  .actions {
    left: 50%;
    transform: translateX(-50%);
    width: min(100%, 40rem);
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
</style>
