import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('event-driven scramble UI bridge', () => {
  it('initializes the scramble menu before asynchronous session selection', () => {
    const timer = source('./Timer.svelte');

    expect(timer).toContain('let MENU: SCRAMBLE_MENU[] = getLanguage(get(globalLang)).MENU;');
    expect(timer).not.toContain('let MENU: SCRAMBLE_MENU[] = [];');
  });

  it('enables the scramble flag, publishes through the runtime, and mirrors accepted state', () => {
    const timer = source('./Timer.svelte');

    expect(timer).toContain('flags: { keyboard: true, scramble: true }');
    expect(timer).toContain('eventTimerRuntime.requestScramble(input, nativeEvent)');
    expect(timer).toContain('timerController.scramble.set(eventTimerRuntime.state.scramble)');
    expect(timer).not.toContain('eventTimerRuntime.state.scramblePreview');
  });

  it('passes native refresh and edit events into the context boundary', () => {
    const options = source('./TimerTab/TimerOptions.svelte');

    expect(options).toContain('initScrambler(undefined, undefined, undefined, event)');
    expect(options).toContain('initScrambler(scr, undefined, undefined, nativeEvent)');
  });

  it('lets the configuration effect own mode and probability changes', () => {
    const options = source('./TimerTab/TimerOptions.svelte');

    expect(options).not.toContain('$prob = $selectedCases.reduce((acc, e, p) => (e ? [...acc, p] : acc), [] as number[]);\n    initScrambler();');
    expect(options).not.toContain('$prob = $selectedCases.reduce((acc, e, p) => (e ? [...acc, p] : acc), [] as number[]);\n      initScrambler();');
  });
});
