import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('managed keyboard UI wiring', () => {
  it('owns one application runtime and native keyboard boundary in the root layout', () => {
    const layout = source('../../routes/+layout.svelte');

    expect(layout).toContain('createTimerApplicationRuntime');
    expect(layout).toContain('setTimerApplicationContext');
    expect(layout).toContain('<TimerKeyboardEventBoundary');
  });

  it('creates an owner runtime from application context and requests the keyboard lease', () => {
    const timer = source('./Timer.svelte');

    expect(timer).toContain('getTimerApplicationContext');
    expect(timer).toContain('const sessionStore = timerController.session');
    expect(timer).toContain('const currentSession = $sessionStore');
    expect(timer).not.toContain('const currentSession = get(timerController.session)');
    expect(timer).toContain('requestActiveDevice(TIMER_DEVICE_IDS.KEYBOARD)');
    expect(timer).toContain('managedKeyboardActive');
  });

  it('suppresses legacy key and pointer delivery while the managed keyboard is active', () => {
    const timerTab = source('./TimerTab/TimerTab.svelte');

    expect(timerTab).toContain('managedKeyboardActive');
    expect(timerTab).toContain('if (managedKeyboardActive) return;');
  });

  it('renders semantic prevention and ready feedback', () => {
    const keyboardDisplay = source('./TimerTab/timer-handlers/KeyboardInputHandler.svelte');

    expect(keyboardDisplay).toContain('class:text-error={$timerState === TimerState.PREVENTION && !$ready}');
    expect(keyboardDisplay).toContain('class:text-success={$ready}');
    expect(keyboardDisplay).toContain('<span class="select-none text-warning">+2</span>');
    expect(keyboardDisplay).toContain('$timerState === TimerState.INSPECTION && $time <= 0');
    expect(keyboardDisplay).not.toContain('$time > -2000');
  });
});
