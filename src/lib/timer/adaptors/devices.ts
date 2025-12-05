import type { GANInput } from "./GAN";
import type { KeyboardInput } from "./Keyboard";
import type { ManualInput } from "./Manual";
import type { QiYiSmartTimerInput } from "./QY-Timer";
import type { StackmatInput } from "./Stackmat";
import type { VirtualInput } from "./Virtual";

export type Device =
  | GANInput
  | KeyboardInput
  | ManualInput
  | QiYiSmartTimerInput
  | StackmatInput
  | VirtualInput;
