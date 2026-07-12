import type { Penalty, Session, SessionSettings, Solve, Statistics } from '@interfaces';
import { TIMER_EVENTS, type TimerEventType } from './TimerEventRegistry';

type EmptyPayload = Record<string, never>;
type DevicePayload = { deviceId: string };

export interface TimerEventPayloadMap extends Record<TimerEventType, object> {
  [TIMER_EVENTS.KEYBOARD_KEY_DOWN]: { code: string; repeat: boolean };
  [TIMER_EVENTS.KEYBOARD_KEY_UP]: { code: string };
  [TIMER_EVENTS.MANUAL_TIME_SUBMITTED]: { elapsedMs: number };
  [TIMER_EVENTS.VIRTUAL_MOVE_RECEIVED]: { move: string; solved: boolean };
  [TIMER_EVENTS.DEVICE_PREVENTION_ENTERED]: DevicePayload;
  [TIMER_EVENTS.DEVICE_READY]: DevicePayload;
  [TIMER_EVENTS.DEVICE_INSPECTION_STARTED]: DevicePayload;
  [TIMER_EVENTS.DEVICE_GREEN_LIGHT_CHANGED]: DevicePayload & { ready: boolean };
  [TIMER_EVENTS.DEVICE_RUN_STARTED]: DevicePayload;
  [TIMER_EVENTS.DEVICE_RUN_STOPPED]: DevicePayload & { elapsedMs: number; steps: number[] };
  [TIMER_EVENTS.DEVICE_RUN_CANCELLED]: DevicePayload;
  [TIMER_EVENTS.DEVICE_PAUSED]: DevicePayload;
  [TIMER_EVENTS.DEVICE_RESUMED]: DevicePayload;
  [TIMER_EVENTS.DEVICE_STEP_COMPLETED]: DevicePayload & { stepNumber: number; elapsedMs: number };
  [TIMER_EVENTS.DEVICE_PENALTY_APPLIED]: DevicePayload & { penalty: Penalty; fromInspection: boolean };
  [TIMER_EVENTS.DEVICE_DISCOVERY_REQUESTED]: EmptyPayload;
  [TIMER_EVENTS.DEVICE_DISCOVERED]: DevicePayload & { name: string; kind: string };
  [TIMER_EVENTS.DEVICE_CONNECTED]: DevicePayload;
  [TIMER_EVENTS.DEVICE_DISCONNECTED]: DevicePayload & { reason?: string };
  [TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED]: DevicePayload;
  [TIMER_EVENTS.ACTIVE_DEVICE_CHANGED]: DevicePayload;
  [TIMER_EVENTS.SESSION_SWITCH_REQUESTED]: { sessionId: string };
  [TIMER_EVENTS.SESSION_SWITCHED]: { previousSession: Session | null; session: Session };
  [TIMER_EVENTS.SESSION_SETTINGS_CHANGE_REQUESTED]: { sessionId: string; settings: Partial<SessionSettings> };
  [TIMER_EVENTS.SESSION_SETTINGS_CHANGED]: { session: Session; changedKeys: string[] };
  [TIMER_EVENTS.SOLVE_ADD_REQUESTED]: { solve: Partial<Solve> };
  [TIMER_EVENTS.SOLVE_ADDED]: { solve: Solve };
  [TIMER_EVENTS.SOLVE_UPDATE_REQUESTED]: { solve: Solve };
  [TIMER_EVENTS.SOLVE_UPDATED]: { previousSolve: Solve; solve: Solve };
  [TIMER_EVENTS.SOLVES_REMOVE_REQUESTED]: { solves: Solve[] };
  [TIMER_EVENTS.SOLVES_REMOVED]: { solves: Solve[] };
  [TIMER_EVENTS.SCRAMBLE_REQUESTED]: { mode: string; probability: number; source: string };
  [TIMER_EVENTS.SCRAMBLE_GENERATED]: { scramble: string; mode: string };
  [TIMER_EVENTS.SCRAMBLE_GENERATION_FAILED]: { mode: string; message: string };
  [TIMER_EVENTS.STATISTICS_REQUESTED]: { sessionId: string };
  [TIMER_EVENTS.STATISTICS_UPDATED]: { statistics: Statistics };
  [TIMER_EVENTS.NEW_RECORD]: { records: Array<{ name: string; previous: number; current: number }> };
  [TIMER_EVENTS.HANDLER_FAILED]: {
    eventId: string;
    eventType: TimerEventType;
    eventTimestamp: number;
    handlerId: string;
    error: { name: string; message: string };
  };
}
