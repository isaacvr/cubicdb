import type { IManualTimeEntryDevice } from "$lib/interfaces/devices.types";

export class ManualInput implements IManualTimeEntryDevice {
  readonly type = "manual_entry";
  enabled = true;
  id = "cubicdb:device:manual_entry";
  name = "Manual";
  init() {}
  disconnect() {}
  keyUpHandler() {}
  keyDownHandler() {}
  stopTimer() {}
  newRecord() {}
  sendEvent() {}
}
