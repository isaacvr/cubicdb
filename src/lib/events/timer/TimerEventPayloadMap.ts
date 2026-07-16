import type { Penalty, Session, SessionSettings, Solve, Statistics } from '@interfaces';
import type {
  DeviceLeaseRejectionReason,
  LegacyTimerDeviceDescriptor,
  TimerDeviceDescriptor,
} from '$lib/timer/devices/TimerDeviceDescriptor';
import { TIMER_EVENTS, type TimerEventType } from './TimerEventRegistry';

type EmptyPayload = Record<string, never>;
type DevicePayload = { deviceId: string };
type OwnerDevicePayload = { ownerId: string; deviceId: string };

export interface TimerEventPayloadMap extends Record<TimerEventType, object> {
  [TIMER_EVENTS.KEYBOARD_KEY_DOWN]: { code: string; repeat: boolean };
  [TIMER_EVENTS.KEYBOARD_KEY_UP]: { code: string };
  [TIMER_EVENTS.MANUAL_TIME_SUBMITTED]: { elapsedMs: number };
  [TIMER_EVENTS.VIRTUAL_MOVE_RECEIVED]: { move: string; solved: boolean };
  [TIMER_EVENTS.DEVICE_PREVENTION_ENTERED]: OwnerDevicePayload;
  [TIMER_EVENTS.DEVICE_READY]: OwnerDevicePayload;
  [TIMER_EVENTS.DEVICE_INSPECTION_STARTED]: OwnerDevicePayload;
  [TIMER_EVENTS.DEVICE_GREEN_LIGHT_CHANGED]: OwnerDevicePayload & { ready: boolean };
  [TIMER_EVENTS.DEVICE_RUN_STARTED]: OwnerDevicePayload;
  [TIMER_EVENTS.DEVICE_RUN_STOPPED]: OwnerDevicePayload & { elapsedMs: number; steps: number[] };
  [TIMER_EVENTS.DEVICE_RUN_CANCELLED]: OwnerDevicePayload;
  [TIMER_EVENTS.DEVICE_PAUSED]: OwnerDevicePayload;
  [TIMER_EVENTS.DEVICE_RESUMED]: OwnerDevicePayload;
  [TIMER_EVENTS.DEVICE_STEP_COMPLETED]: OwnerDevicePayload & { stepNumber: number; elapsedMs: number };
  [TIMER_EVENTS.DEVICE_PENALTY_APPLIED]: OwnerDevicePayload & { penalty: Penalty; fromInspection: boolean };
  [TIMER_EVENTS.DEVICE_DISCOVERY_REQUESTED]: EmptyPayload;
  [TIMER_EVENTS.DEVICE_DISCOVERED]: DevicePayload & { name: string; kind: string };
  [TIMER_EVENTS.DEVICE_CONNECTED]: DevicePayload;
  [TIMER_EVENTS.DEVICE_DISCONNECTED]: DevicePayload & { reason?: string };
  [TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED]: OwnerDevicePayload;
  [TIMER_EVENTS.ACTIVE_DEVICE_CHANGED]: OwnerDevicePayload & { previousDeviceId: string | null };
  [TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REJECTED]: OwnerDevicePayload & {
    reason: DeviceLeaseRejectionReason;
  };
  [TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED]: OwnerDevicePayload;
  [TIMER_EVENTS.ACTIVE_DEVICE_RELEASED]: OwnerDevicePayload;
  [TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REJECTED]: OwnerDevicePayload & { reason: 'stop-failed' };
  [TIMER_EVENTS.DEVICE_DISCONNECT_REQUESTED]: DevicePayload;
  [TIMER_EVENTS.DEVICE_DISCONNECT_FAILED]: DevicePayload & { reason: 'disconnect-failed' };
  [TIMER_EVENTS.DEVICE_CATALOG_UPDATED]: { devices: readonly TimerDeviceDescriptor[] };
  [TIMER_EVENTS.LEGACY_DEVICE_CATALOG_SYNC_REQUESTED]: {
    devices: readonly LegacyTimerDeviceDescriptor[];
  };
  [TIMER_EVENTS.DEVICE_OWNER_DESTROY_REQUESTED]: { ownerId: string };
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
