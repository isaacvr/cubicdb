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

    expect(source).toContain("let solveEditTransitionNames = $state(createSolveEditTransitionNames())");
    expect(source).toContain("function createSolveEditTransitionNames");
    expect(source).toContain("const transitionTarget = ev.currentTarget as HTMLButtonElement");
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
    expect(source).toContain("transitionName={solveEditTransitionNames.shell}");
    expect(source).toContain("style:view-transition-name={solveEditTransitionNames.date}");
    expect(source).toContain("style:view-transition-name={solveEditTransitionNames.time}");
    expect(source).not.toContain("view-transition-name: modal");
    expect(source).not.toContain("modal-transition");
  });

  it("keeps History solve rows at a fixed height when layout size changes", () => {
    const source = read("./HistoryTab/HistoryTab.svelte");

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
    const source = read("./HistoryTab/HistoryTab.svelte");

    expect(source).toContain("allowDownload");
    expect(source).not.toContain("allowDownload={!collapsed}");
    expect(source).not.toContain("onclick={() => (collapsed = !collapsed)}");
    expect(source).toContain("bg-base-200 text-base-content");
  });
});
