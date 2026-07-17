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
    expect(timer).toContain('getScrambleRequest: source => {');
    expect(timer).toContain('return createScrambleRequestInput');
    expect(timer).toContain('timerController.scramble.set(eventTimerRuntime.state.scramble)');
    expect(timer).toContain('eventTimerRuntime.state.scramblePreview.map');
  });

  it('passes native refresh and edit events into the context boundary', () => {
    const options = source('./TimerTab/TimerOptions.svelte');

    expect(options).toContain('initScrambler(undefined, undefined, undefined, event)');
    expect(options).toContain('initScrambler(scr, undefined, undefined, nativeEvent)');
  });

  it('leaves Ctrl+C available for native browser copy', () => {
    const options = source('./TimerTab/TimerOptions.svelte');

    expect(options).not.toContain('code === "KeyC" && options.copyScramble');
    expect(options).not.toContain('keyBindings={["control", "c"]}');
  });

  it('resolves a fallback mode before publishing scramble requests', () => {
    const timer = source('./Timer.svelte');

    expect(timer).toContain('resolveScrambleModeSelection');
    expect(timer).toContain('selectedGroup: get(timerController.group)');
    expect(timer).toContain('selectedGroup: $groupStore');
    expect(timer).toContain('if (!selectedMode) return null;');
    expect(timer).toContain('if (!selectedMode) return;');
  });

  it('lets the configuration effect own mode and probability changes', () => {
    const options = source('./TimerTab/TimerOptions.svelte');

    expect(options).not.toContain('$prob = $selectedCases.reduce((acc, e, p) => (e ? [...acc, p] : acc), [] as number[]);\n    initScrambler();');
    expect(options).not.toContain('$prob = $selectedCases.reduce((acc, e, p) => (e ? [...acc, p] : acc), [] as number[]);\n      initScrambler();');
  });
});
