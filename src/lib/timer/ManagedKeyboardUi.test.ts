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
    expect(timer).toContain('requestActiveDevice(TIMER_DEVICE_IDS.KEYBOARD)');
    expect(timer).toContain('managedKeyboardActive');
  });

  it('suppresses legacy key and pointer delivery while the managed keyboard is active', () => {
    const timerTab = source('./TimerTab/TimerTab.svelte');

    expect(timerTab).toContain('managedKeyboardActive');
    expect(timerTab).toContain('if (managedKeyboardActive) return;');
  });
});
