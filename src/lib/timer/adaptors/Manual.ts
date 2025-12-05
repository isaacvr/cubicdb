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
  toJSON() {
    return {
      type: this.type,
      id: this.id,
      name: this.name,
    };
  }

  fromJSON(config: Record<string, any>) {
    if (["id", "name"].some(e => !config[e])) return null;
    this.id = config.id;
    this.name = config.name;
  }
}
