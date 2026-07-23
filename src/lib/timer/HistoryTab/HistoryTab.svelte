<script lang="ts">
  import { Penalty, type ITimerController, type Solve, type TimerContext } from "@interfaces";
  import { isMo3, sTimer } from "@helpers/timer";

  import { options } from "@cstimer/scramble/scramble";
  import { CubeMode } from "@constants";
  import { Paginator } from "@classes/Paginator";

  import { NotificationService } from "@stores/notification.service";

  import { localLang } from "@stores/language.service";
  import { tick } from "svelte";
  import { replaceParams } from "@helpers/strings";
  import { copyTextToClipboard } from "@helpers/clipboard";
  import { startViewTransition } from "@helpers/DOM";
  import ConfirmationModal from "@components/ConfirmationModal.svelte";
  import {
    createConfirmationModalModel,
    type ConfirmationModalModel,
  } from "@components/ConfirmationModal.types";
  import AdvancedSearchModal from "./components/AdvancedSearchModal.svelte";
  import HistoryOptions from "./components/HistoryOptions.svelte";
  import HistorySelectionToolbar from "./components/HistorySelectionToolbar.svelte";
  import SolveDetailsModal from "./components/SolveDetailsModal.svelte";
  import SolveGrid from "./components/SolveGrid.svelte";
  import PaginatorComponent from "@components/PaginatorComponent.svelte";
  import { GateAdaptor } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors";
  import { dataService } from "$lib/data-services/data.service";
  import { useSolve } from "$lib/timer/solves";
  import { CubicDBModuleImageGenerator } from "$lib/timer/scramble";
  import { createEmptySolve } from "@helpers/object";
  import {
    averageSummaryFromSolve,
    formatAverageShare,
    solveIndex as getSolveIndex,
  } from "./historySharing";
  import {
    CopyIcon,
    Dice3Icon,
    Dice5Icon,
    DicesIcon,
    PencilIcon,
    SquareDashedIcon,
    TrashIcon,
  } from "lucide-svelte";

  const notification = NotificationService.getInstance();
  const solvePreviewGenerator = new CubicDBModuleImageGenerator();

  interface HistoryTabProps {
    context: TimerContext;
    timerController: ITimerController;
  }

  let { context = $bindable(), timerController = $bindable() }: HistoryTabProps = $props();

  const { tab, session } = timerController;
  const solveFeature = useSolve(() => $session?._id ?? "");

  let pg = $state(new Paginator([], 100));
  let show = $state(false);
  let confirmationModal = $state(createConfirmationModalModel());
  let sSolve: Solve = $state(createEmptySolve());
  let gSolve: Solve;
  let preview: string[] = $state([""]);
  let showContextMenu = $state(false);
  let contextMenuElement: HTMLUListElement;
  let solvesElement: HTMLDivElement;
  let pSolves: Solve[] = $state([]);
  let fSolves: Solve[] = [];
  let solveEditTransitionNames = $state(createSolveEditTransitionNames());
  let searchModal = $state(false);
  let advancedSearchGate = $state(new GateAdaptor("and"));
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

  function afterNextFrame() {
    return new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }

  async function generateSolvePreview(solve: Solve) {
    const sMode = solve.mode as string;
    const md = options.has(sMode) ? sMode : "333";

    await afterNextFrame();

    if (sSolve?._id === solve._id) {
      preview = await solvePreviewGenerator.generate({
        scramble: solve.scramble,
        scrambleMode: md,
        puzzle: "rubik",
        mode: CubeMode.NORMAL,
        view: "trans",
      });
    }
  }

  export function editSolve(s: Solve) {
    gSolve = s;
    sSolve = createEditableSolve(s);
    preview = [""];

    show = true;
    void generateSolvePreview(sSolve);
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

  function openConfirmationModal(config: Omit<ConfirmationModalModel, "show">) {
    confirmationModal.title = config.title;
    confirmationModal.message = config.message;
    confirmationModal.cancelLabel = config.cancelLabel;
    confirmationModal.confirmLabel = config.confirmLabel;
    confirmationModal.confirmType = config.confirmType;
    confirmationModal.closeOnClickOutside = config.closeOnClickOutside;
    confirmationModal.oncancel = config.oncancel;
    confirmationModal.onconfirm = config.onconfirm;
    confirmationModal.show = true;
  }

  function deleteAll() {
    openConfirmationModal({
      message: $localLang.TIMER.removeAllSolves,
      cancelLabel: $localLang.global.cancel,
      confirmLabel: $localLang.global.delete,
      confirmType: "danger",
      onconfirm: confirmDeleteAll,
    });
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
    showContextMenu = false;
    openConfirmationModal({
      title: $localLang.global.delete,
      message: replaceParams($localLang.global.deleteWarning, [sTimer(s, true)]),
      cancelLabel: $localLang.global.cancel,
      confirmLabel: $localLang.global.delete,
      confirmType: "danger",
      onconfirm: confirmDeleteSolve,
    });
  }

  function confirmDeleteSolve() {
    void solveFeature.remove([sSolve]);
    confirmationModal.show = false;
    closeHandler();
  }

  function deleteSelected() {
    void solveFeature.removeSelected();
  }

  function confirmDeleteAll() {
    confirmationModal.show = false;
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
        confirmationModal.show && confirmationModal.onconfirm?.();
    }
  }

  function updateFilteredSolves() {
    fSolves = solveFeature.solves.filter(sv => advancedSearchGate.computeValue(sv));
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
    const text = formatAverageShare(solveFeature.solves, n);
    if (text) copyHistoryText(text);
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

    showContextMenu = true;
  }

  function updatePageFromSelected() {
    if (solveFeature.selectedCount) {
      let sv = fSolves;

      for (let i = 0, maxi = sv.length; i < maxi; i += 1) {
        if (sv[i].selected) {
          let page = Math.ceil((i + 1) / pg.limit);
          pg.setPage(page);
          pSolves = fSolves.slice(pg.start, pg.end);
          tick().then(() => {
            solvesElement.children[i - pg.start].scrollIntoView({ block: "center" });
          });
          break;
        }
      }
    }
  }

  function globalHandleClick() {
    showContextMenu = false;
  }

  function solveIndex(sv: Solve) {
    return getSolveIndex(solveFeature.solves, sv);
  }

  function copyAverage(sv: Solve, n: number) {
    copyTextToClipboard(averageSummaryFromSolve(solveFeature.solves, sv, n)).then(
      notifyCopiedToClipboard
    );
  }

  $effect(() => updateFilteredSolves());
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
  <PaginatorComponent {pg} data={fSolves} bind:items={pSolves} />

  <!-- Solves -->
  <SolveGrid
    solves={pSolves}
    onOpen={handleSolveOpen}
    onContextMenu={handleContextMenu}
    onGridElement={element => (solvesElement = element)}
  />

  <HistoryOptions
    hasSolves={solveFeature.solves.length > 0}
    ondeleteAll={deleteAll}
    onshareAo5={() => shareAoX(5)}
    onshareAo12={() => shareAoX(12)}
    onopenFilter={() => (searchModal = true)}
  />

  <HistorySelectionToolbar
    selectedCount={solveFeature.selectedCount}
    onselectAll={selectAll}
    onselectInterval={selectInterval}
    oninvertSelection={selectInvert}
    oncancel={selectNone}
    ondeleteSelected={deleteSelected}
  />

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
  session={$session}
  transitionNames={solveEditTransitionNames}
  onclose={closeHandler}
  ondelete={() => requestDeleteSolve(sSolve)}
  onsetPenalty={setPenalty}
/>

<ConfirmationModal bind:modal={confirmationModal} />

<AdvancedSearchModal
  bind:show={searchModal}
  bind:gate={advancedSearchGate}
  onapply={updateFilteredSolves}
/>

<style lang="postcss">
  @reference "@src/themes/index.css";

  section {
    grid-area: tabs;
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
