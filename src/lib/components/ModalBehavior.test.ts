import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("modal behavior contracts", () => {
  it("keeps the shared modal above app chrome with a visible backdrop", () => {
    const modal = source("./Modal.svelte");

    expect(modal).toContain('variant?: "limited" | "fullscreen"');
    expect(modal).toContain('size?: "sm" | "md" | "lg" | "xl" | "2xl"');
    expect(modal).toContain("title?: string");
    expect(modal).toContain("showCloseButton?: boolean");
    expect(modal).toContain("closeOnClickOutside = $bindable(false)");
    expect(modal).toContain("showCloseButton ?? (cancel && Boolean(title))");
    expect(modal).toContain("z-[1000]");
    expect(modal).toContain("max-w-[calc(100vw-1rem)]");
    expect(modal).toContain("max-h-[calc(100svh-1rem)]");
    expect(modal).toContain("{#if hasHeader}");
    expect(modal).toContain("{#if title}");
    expect(modal).toContain("{#if shouldShowCloseButton}");
    expect(modal).toContain('variant === "fullscreen" ? "p-0" : "p-6"');
    expect(modal).not.toContain("if (!cancel) return;");
    expect(modal).not.toContain("fixed right-3 top-3");
    expect(modal).toContain("cdb-modal-surface");
    expect(modal).toContain("background-color: var(--color-base-200)");
    expect(modal).toContain("backdrop-filter: none");
    expect(modal).toContain('dialog[data-type="modal"][open]');
    expect(modal).toContain("backdrop-filter: blur(0.5rem)");
    expect(modal).not.toContain("z-index: -1");
  });

  it("opens the timer preview image through the shared modal", () => {
    const timerTab = source("../timer/TimerTab/TimerTab.svelte");

    expect(timerTab).toContain('import Modal from "@components/Modal.svelte"');
    expect(timerTab).toContain("<Modal");
    expect(timerTab).toContain('variant="fullscreen"');
    expect(timerTab).toContain("showCloseButton");
    expect(timerTab).not.toContain("<dialog");
  });

  it("normalizes history solve comments before binding them in the details modal", () => {
    const historyTab = source("../timer/HistoryTab/HistoryTab.svelte");

    expect(historyTab).toContain("createEditableSolve");
    expect(historyTab).toContain('comments: solve.comments ?? ""');
    expect(historyTab).toContain("bind:value={sSolve.comments}");
  });

  it("makes history solve details closable and protects destructive actions", () => {
    const historyTab = source("../timer/HistoryTab/HistoryTab.svelte");

    expect(historyTab).toContain("title={$localLang.TIMER.edit}");
    expect(historyTab).toContain("showCloseButton");
    expect(historyTab).toContain("closeOnClickOutside");
    expect(historyTab).toContain("onclick={() => closeHandler()}");
    expect(historyTab).toContain("showDeleteSolve");
    expect(historyTab).toContain("confirmDeleteSolve");
    expect(historyTab).toContain("replaceParams($localLang.global.deleteWarning");
  });

  it("closes outside-click modals by checking clicks against modal content, not dialog backdrop", () => {
    const modal = source("./Modal.svelte");

    expect(modal).toContain("function getModalContentRect()");
    expect(modal).toContain("modal.firstElementChild");
    expect(modal).toContain("const contentRect = getModalContentRect()");
    expect(modal).toContain("clickedOutsideContent");
  });

  it("applies the modal view-transition name to the modal content box only while open", () => {
    const modal = source("./Modal.svelte");

    expect(modal).toContain('activeTransitionName = $derived(show ? transitionName : "none")');
    expect(modal).toContain('style="view-transition-name: none;"');
    expect(modal).toContain(
      '<div class={modalBoxClass(variant, size, _cl)} style="view-transition-name: {activeTransitionName};">'
    );
    expect(modal).not.toContain("view-transition-name: {transitionName};");
  });

  it("does not run a separate dialog entrance animation during modal view transitions", () => {
    const modal = source("./Modal.svelte");

    expect(modal).not.toContain("animation: enter");
    expect(modal).not.toContain("ease-in 1");
  });

  it("hides solve steps outside multi-step sessions and keeps invalid comments visually neutral", () => {
    const historyTab = source("../timer/HistoryTab/HistoryTab.svelte");

    expect(historyTab).toContain("function isMultiStepSession()");
    expect(historyTab).toContain("{#if isMultiStepSession() && sSolve?.steps?.length}");
    expect(historyTab).toContain("return res.hasError ? defaultInner(s, true) : res.result");
    expect(historyTab).toContain("res.hasError || res.finalAlpha === 0");
  });
});
