import { TIMER_EVENTS } from "$lib/events/timer/TimerEventRegistry";
import type { NativeTimestampSource } from "$lib/events/timer/TimerEventFactory";
import {
  createTypedEventEmitter,
  type TypedEventEmitterDependencies,
} from "./createTypedEventEmitter";

interface OwnerScopedEmitterInput {
  ownerId: string;
  sourceEvent?: NativeTimestampSource;
}

export interface ActiveDeviceEmitterInput extends OwnerScopedEmitterInput {
  deviceId: string;
}

function options(sourceEvent?: NativeTimestampSource) {
  return sourceEvent ? { sourceEvent } : undefined;
}

export function createDeviceEventEmitters(dependencies: TypedEventEmitterDependencies) {
  const emit = createTypedEventEmitter(dependencies);

  return {
    requestActiveDevice(input: ActiveDeviceEmitterInput) {
      return emit(
        TIMER_EVENTS.ACTIVE_DEVICE_CHANGE_REQUESTED,
        { ownerId: input.ownerId, deviceId: input.deviceId },
        options(input.sourceEvent)
      );
    },
    requestActiveDeviceRelease(input: ActiveDeviceEmitterInput) {
      return emit(
        TIMER_EVENTS.ACTIVE_DEVICE_RELEASE_REQUESTED,
        { ownerId: input.ownerId, deviceId: input.deviceId },
        options(input.sourceEvent)
      );
    },
    requestOwnerDestroy(input: OwnerScopedEmitterInput) {
      return emit(
        TIMER_EVENTS.DEVICE_OWNER_DESTROY_REQUESTED,
        { ownerId: input.ownerId },
        options(input.sourceEvent)
      );
    },
  };
}
