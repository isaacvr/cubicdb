import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("timer regression contracts", () => {
  it("uses Ctrl+Arrow tab navigation and ignores text editing targets", () => {
    const source = read("./utilities/useKeyboardHandler.ts");
    const timer = read("./Timer.svelte");

    expect(source).toContain("isTextEditingTarget");
    expect(source).toContain("if (isTextEditingTarget(e.target)) return");
    expect(source).toContain('e.ctrlKey && e.key === "ArrowRight"');
    expect(source).toContain('e.ctrlKey && e.key === "ArrowLeft"');
    expect(source).not.toContain("if (e.key === 'ArrowRight')");
    expect(source).not.toContain("if (e.key === 'ArrowLeft')");
    expect(timer.indexOf("keyboardMgr.handleKeydown(event)")).toBeLessThan(
      timer.indexOf("if (!timerKeyboardInputActive) return")
    );
    expect(timer.indexOf("keyboardMgr.handleKeydown(event)")).toBeLessThan(
      timer.indexOf("if (managedKeyboardActive) return")
    );
  });

  it("does not assign duplicate view transition names to the solve edit modal", () => {
    const source = read("./HistoryTab/HistoryTab.svelte");
    const detailsModal = read("./HistoryTab/components/SolveDetailsModal.svelte");

    expect(source).toContain(
      "let solveEditTransitionNames = $state(createSolveEditTransitionNames())"
    );
    expect(source).toContain("function createSolveEditTransitionNames");
    expect(source).toContain("function handleSolveOpen");
    expect(source).toContain("if (!transitionTarget.isConnected)");
    expect(source).toContain("const transitionNames = createSolveEditTransitionNames(s)");
    expect(source).toContain('querySelector<HTMLElement>(".solve-row-date")');
    expect(source).toContain('querySelector<HTMLElement>(".solve-row-time")');
    expect(source).toContain("transitionTarget.style.viewTransitionName = transitionNames.shell");
    expect(source).toContain("dateTarget.style.viewTransitionName = transitionNames.date");
    expect(source).toContain("timeTarget.style.viewTransitionName = transitionNames.time");
    expect(source).toContain('transitionTarget.style.viewTransitionName = "none"');
    expect(source).toContain('dateTarget.style.viewTransitionName = "none"');
    expect(source).toContain('timeTarget.style.viewTransitionName = "none"');
    expect(source).toContain("transitionNames={solveEditTransitionNames}");
    expect(detailsModal).toContain("transitionName={transitionNames.shell}");
    expect(detailsModal).toContain("style:view-transition-name={transitionNames.date}");
    expect(detailsModal).toContain("style:view-transition-name={transitionNames.time}");
    expect(source).not.toContain("view-transition-name: modal");
    expect(source).not.toContain("modal-transition");
  });

  it("opens solve details without delaying the view transition for double-click detection", () => {
    const source = read("./HistoryTab/HistoryTab.svelte");

    expect(source).toContain("function openSolveDetails");
    expect(source).toContain("openSolveDetails(s, transitionTarget)");
    expect(source).not.toContain(
      "setTimeout(() => {\n        if (performance.now() - LAST_CLICK >= 200)"
    );
  });

  it("defers solve preview generation until after the modal is opened for view transitions", () => {
    const source = read("./HistoryTab/HistoryTab.svelte");
    const previewStart = source.indexOf("function generateSolvePreview");
    const editStart = source.indexOf("export function editSolve");
    const editEnd = source.indexOf("function selectSolve");
    const previewBlock = source.slice(previewStart, editStart);
    const editBlock = source.slice(editStart, editEnd);

    expect(source).toContain("function generateSolvePreview");
    expect(source).toContain("function afterNextFrame");
    expect(source).toContain("requestAnimationFrame");
    expect(previewBlock).toContain("await afterNextFrame()");
    expect(previewBlock.indexOf("await afterNextFrame()")).toBeLessThan(
      previewBlock.indexOf("solvePreviewGenerator.generate")
    );
    expect(editBlock.indexOf("show = true")).toBeLessThan(
      editBlock.indexOf("generateSolvePreview(sSolve)")
    );
    expect(source).toContain("new CubicDBModuleImageGenerator()");
    expect(editBlock).not.toContain("pGenerateCubeBundle");
    expect(source).not.toContain("scrambleToPuzzle");
    expect(source).not.toContain("pGenerateCubeBundle");
  });

  it("uses cubicdb-module for the controller plain scramble preview image", () => {
    const source = read("../controllers/TimerController.ts");

    expect(source).toContain('import { genImages } from "cubicdb-module"');
    expect(source).toContain("this.setPreview(genImages([{ scramble: get(scramble), type: md }]))");
    expect(source).not.toContain("pGenerateCubeBundle");
    expect(source).not.toContain("scrambleToPuzzle");
  });

  it("keeps History solve rows at a fixed height when layout size changes", () => {
    const source = read("./HistoryTab/components/SolveGrid.svelte");

    expect(source).toContain("grid-auto-rows: 3rem");
    expect(source).toContain("shadow-md w-full h-full rounded-md");
    expect(source).not.toContain("h-full min-h-[3rem]");
  });

  it("updates solve projections with new array references so the UI refreshes", () => {
    const source = read("./utilities/useSolveManager.ts");

    expect(source).toContain("allSolves.update(allSolvesVal =>");
    expect(source).toContain("allSolvesVal.map");
    expect(source).toContain("solves.set(solvesVal.filter");
    expect(source).not.toContain("allSolvesVal[i].comments");
    expect(source).not.toContain("solvesVal.splice");
  });

  it("keeps solve edit preview actions visible and dropdowns themed inside the modal", () => {
    const source = read("./HistoryTab/components/SolveDetailsModal.svelte");

    expect(source).toContain("allowDownload");
    expect(source).not.toContain("allowDownload={!collapsed}");
    expect(source).not.toContain("onclick={() => (collapsed = !collapsed)}");
    expect(source).toContain("bg-base-200 text-base-content");
  });

  it("selects History intervals from the filtered solve list", () => {
    const source = read("./HistoryTab/HistoryTab.svelte");
    const selectIntervalStart = source.indexOf("function selectInterval");
    const selectNoneStart = source.indexOf("function selectNone");
    const selectIntervalBlock = source.slice(selectIntervalStart, selectNoneStart);

    expect(selectIntervalBlock).toContain("solveFeature.selectInterval(fSolves)");
    expect(selectIntervalBlock).not.toContain("$solves[i].selected");
  });

  it("uses themed keycaps for History action shortcuts", () => {
    const source = read("./HistoryTab/components/HistorySelectionToolbar.svelte");

    expect(source).toContain("const SHORTCUT_CLASS");
    expect(source).toContain(
      "border-warning bg-warning text-xs font-bold text-warning-content shadow-sm"
    );
    expect(source).toContain("<span class={SHORTCUT_CLASS}>A</span>");
    expect(source).toContain("<span class={SHORTCUT_CLASS}>T</span>");
    expect(source).toContain("<span class={SHORTCUT_CLASS}>V</span>");
    expect(source).toContain("<span class={SHORTCUT_CLASS}>Esc</span>");
    expect(source).toContain("<span class={SHORTCUT_CLASS}>D</span>");
    expect(source).not.toContain('<span class="kbd kbd-sm">');
  });
});
