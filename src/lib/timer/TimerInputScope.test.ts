import { describe, expect, it } from "vitest";
import { TimerState } from "@interfaces";
import {
  TIMER_TAB_INDEX,
  shouldCancelTimerInputOnTabChange,
  shouldProcessTimerKeyboardInput,
} from "./TimerInputScope";

describe("TimerInputScope", () => {
  it("processes keyboard input only on the timer tab", () => {
    expect(shouldProcessTimerKeyboardInput(TIMER_TAB_INDEX)).toBe(true);
    expect(shouldProcessTimerKeyboardInput(1)).toBe(false);
    expect(shouldProcessTimerKeyboardInput(2)).toBe(false);
  });

  it("cancels active timer input when leaving the timer tab", () => {
    expect(shouldCancelTimerInputOnTabChange(0, 1, TimerState.PREVENTION)).toBe(true);
    expect(shouldCancelTimerInputOnTabChange(0, 1, TimerState.INSPECTION)).toBe(true);
    expect(shouldCancelTimerInputOnTabChange(0, 1, TimerState.RUNNING)).toBe(true);
    expect(shouldCancelTimerInputOnTabChange(0, 1, TimerState.PAUSE)).toBe(true);
  });

  it("does not cancel inactive or non-timer tab transitions", () => {
    expect(shouldCancelTimerInputOnTabChange(0, 1, TimerState.CLEAN)).toBe(false);
    expect(shouldCancelTimerInputOnTabChange(0, 1, TimerState.STOPPED)).toBe(false);
    expect(shouldCancelTimerInputOnTabChange(1, 2, TimerState.RUNNING)).toBe(false);
    expect(shouldCancelTimerInputOnTabChange(1, 0, TimerState.RUNNING)).toBe(false);
    expect(shouldCancelTimerInputOnTabChange(0, 0, TimerState.RUNNING)).toBe(false);
  });
});
