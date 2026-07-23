<script lang="ts">
  import type { ITimerController, Solve } from "@interfaces";
  import { sTimer } from "@helpers/timer";

  import { Paginator } from "@classes/Paginator";

  import { NotificationService } from "@stores/notification.service";

  import { localLang } from "@stores/language.service";
  import { tick } from "svelte";
  import { replaceParams } from "@helpers/strings";
  import { copyTextToClipboard } from "@helpers/clipboard";
  import ConfirmationModal from "@components/ConfirmationModal.svelte";
  import {
    createConfirmationModalModel,
    type ConfirmationModalModel,
  } from "@components/ConfirmationModal.types";
  import AdvancedSearchModal from "./components/AdvancedSearchModal.svelte";
  import HistoryContextMenu from "./components/HistoryContextMenu.svelte";
  import HistoryOptions from "./components/HistoryOptions.svelte";
  import HistorySelectionToolbar from "./components/HistorySelectionToolbar.svelte";
  import SolveDetailsModal from "./components/SolveDetailsModal.svelte";
  import SolveGrid from "./components/SolveGrid.svelte";
  import PaginatorComponent from "@components/PaginatorComponent.svelte";
  import { GateAdaptor } from "$lib/timer/HistoryTab/AdvancedSearch/adaptors";
  import { useSolve } from "$lib/timer/solves";
  import { CubicDBModuleImageGenerator } from "$lib/timer/scramble";
  import { createEmptySolve } from "@helpers/object";
  import {
    applyPenalty,
    createEditableSolve,
    createSolveEditTransitionNames,
    generateSolvePreview,
    openSolveDetailsWithTransition,
    type SolveEditTransitionNames,
  } from "./solveDetailsActions";

  const notification = NotificationService.getInstance();
  const solvePreviewGenerator = new CubicDBModuleImageGenerator();

  interface HistoryTabProps {
    timerController: ITimerController;
  }

  let { timerController = $bindable() }: HistoryTabProps = $props();

  const { tab, session } = timerController;
  const solveFeature = useSolve(() => $session?._id ?? "");

  let pg = $state(new Paginator([], 100));
  let show = $state(false);
  let confirmationModal = $state(createConfirmationModalModel());
  let sSolve: Solve = $state(createEmptySolve());
  let gSolve: Solve;
  let preview: string[] = $state([""]);
  let contextMenu: {
    open: (event: MouseEvent, solve: Solve) => void;
    close: () => void;
  };
  let solvesElement: HTMLDivElement;
  let pSolves: Solve[] = $state([]);
  let fSolves: Solve[] = [];
  let solveEditTransitionNames: SolveEditTransitionNames = $state(createSolveEditTransitionNames());
  let searchModal = $state(false);
  let advancedSearchGate = $state(new GateAdaptor("and"));

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

  async function loadSolvePreview(solve: Solve) {
    preview =
      (await generateSolvePreview(solve, solvePreviewGenerator, () => sSolve?._id === solve._id)) ||
      preview;
  }

  export function editSolve(s: Solve) {
    gSolve = s;
    sSolve = createEditableSolve(s);
    preview = [""];

    show = true;
    void loadSolvePreview(sSolve);
  }

  function handleSolveOpen(s: Solve, transitionTarget: HTMLButtonElement) {
    if (solveFeature.selectedCount) {
      solveFeature.toggleSelected(s);
      return;
    }

    openSolveDetailsWithTransition({
      solve: s,
      transitionTarget,
      setTransitionNames: transitionNames => (solveEditTransitionNames = transitionNames),
      openSolve: editSolve,
    });
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

  function requestDeleteSolve(s: Solve) {
    sSolve = s;
    contextMenu?.close();
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

  function confirmDeleteAll() {
    confirmationModal.show = false;
    void solveFeature.remove(solveFeature.solves);
  }

  function handleKeydown(e: KeyboardEvent) {
    if ($tab != 1) return;

    switch (e.code) {
      case "Escape":
        solveFeature.clearSelection();
        contextMenu?.close();
        break;
      case "KeyA":
        !show && solveFeature.selectAll(fSolves);
        break;
      case "KeyT":
        !show && solveFeature.selectInterval(fSolves);
        break;
      case "KeyV":
        !show && solveFeature.invertSelection(fSolves);
        break;
      case "KeyD":
        !show && (solveFeature.selectedCount ? void solveFeature.removeSelected() : deleteAll());
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

  $effect(() => updateFilteredSolves());
  $effect(() => updatePageFromSelected());
  $effect(() => {
    if ($tab != 1 && solveFeature.selectedCount) solveFeature.clearSelection();
  });
</script>

<svelte:window onkeydown={handleKeydown} onclick={() => contextMenu?.close()} />

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
    onContextMenu={(event, solve) => contextMenu.open(event, solve)}
    onGridElement={element => (solvesElement = element)}
  />

  <HistoryOptions
    hasSolves={solveFeature.solves.length > 0}
    solves={solveFeature.solves}
    ondeleteAll={deleteAll}
    oncopyText={copyHistoryText}
    onopenFilter={() => (searchModal = true)}
  />

  <HistorySelectionToolbar
    selectedCount={solveFeature.selectedCount}
    onselectAll={() => solveFeature.selectAll(fSolves)}
    onselectInterval={() => solveFeature.selectInterval(fSolves)}
    oninvertSelection={() => solveFeature.invertSelection(fSolves)}
    oncancel={() => solveFeature.clearSelection()}
    ondeleteSelected={() => void solveFeature.removeSelected()}
  />

  <HistoryContextMenu
    bind:this={contextMenu}
    solves={solveFeature.solves}
    sessionMode={$session?.settings.mode || ""}
    onedit={editSolve}
    onselect={solve => solveFeature.toggleSelected(solve)}
    ondelete={requestDeleteSolve}
    oncopyText={copyHistoryText}
  />
</section>

<SolveDetailsModal
  bind:show
  bind:solve={sSolve}
  {preview}
  session={$session}
  transitionNames={solveEditTransitionNames}
  onclose={closeHandler}
  ondelete={() => requestDeleteSolve(sSolve)}
  onsetPenalty={penalty => sSolve && applyPenalty(sSolve, penalty)}
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
</style>
