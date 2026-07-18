import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('modal behavior contracts', () => {
  it('keeps the shared modal above app chrome with a visible backdrop', () => {
    const modal = source('./Modal.svelte');

    expect(modal).toContain('variant?: "limited" | "fullscreen"');
    expect(modal).toContain('size?: "sm" | "md" | "lg" | "xl" | "2xl"');
    expect(modal).toContain('title?: string');
    expect(modal).toContain('showCloseButton?: boolean');
    expect(modal).toContain('z-[1000]');
    expect(modal).toContain('max-w-[calc(100vw-1rem)]');
    expect(modal).toContain('max-h-[calc(100svh-1rem)]');
    expect(modal).toContain('{#if hasHeader}');
    expect(modal).toContain('{#if title}');
    expect(modal).toContain('{#if shouldShowCloseButton}');
    expect(modal).toContain('variant === "fullscreen" ? "p-0" : "p-6"');
    expect(modal).not.toContain('fixed right-3 top-3');
    expect(modal).not.toContain('modal-surface');
    expect(modal).toContain('dialog::backdrop');
    expect(modal).toContain('backdrop-filter: blur(0.5rem)');
    expect(modal).not.toContain('z-index: -1');
  });

  it('opens the timer preview image through the shared modal', () => {
    const timerTab = source('../timer/TimerTab/TimerTab.svelte');

    expect(timerTab).toContain('import Modal from "@components/Modal.svelte"');
    expect(timerTab).toContain('<Modal');
    expect(timerTab).toContain('variant="fullscreen"');
    expect(timerTab).toContain('showCloseButton');
    expect(timerTab).not.toContain('<dialog');
  });

  it('normalizes history solve comments before binding them in the details modal', () => {
    const historyTab = source('../timer/HistoryTab/HistoryTab.svelte');

    expect(historyTab).toContain('createEditableSolve');
    expect(historyTab).toContain('comments: solve.comments ?? ""');
    expect(historyTab).toContain('bind:value={sSolve.comments}');
  });
});
