import type { Device } from "$lib/timer/adaptors/devices";
import { KeyboardInput } from "$lib/timer/adaptors/Keyboard";
import { ManualInput } from "$lib/timer/adaptors/Manual";
import { StackmatInput } from "$lib/timer/adaptors/Stackmat";
import { VirtualInput } from "$lib/timer/adaptors/Virtual";
import { writable, type Writable } from "svelte/store";

let devices: Writable<Device[]> = writable([
  new KeyboardInput(),
  new ManualInput(),
  new StackmatInput(),
  new VirtualInput(),
]);

export { devices };
