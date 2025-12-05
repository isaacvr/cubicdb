import type { CubieCube } from "@cstimer/lib/mathlib";
import type { InputContext } from "@interfaces";

// Base interface for all devices
interface BaseDevice {
  id: string;
  name: string;
  enabled: boolean;

  init: (context: InputContext, ...args: any[]) => any;
  disconnect: () => void;
  stopTimer: () => void;
  keyUpHandler: (e: KeyboardEvent) => void;
  keyDownHandler: (e: KeyboardEvent) => void;
  sendEvent: (e: { type: string; data?: any }) => void;
  newRecord: () => void;
  toJSON: () => Record<string, any>;
  fromJSON: (config: Record<string, any>) => any;
}

// Keyboard for controlling the timer
export interface ITimerKeyboardDevice extends BaseDevice {
  type: "timer_keyboard";
}

// Manual time entry
export interface IManualTimeEntryDevice extends BaseDevice {
  type: "manual_entry";
}

// GAN iCarry timer (Bluetooth)
export interface IGANiCarryDevice extends BaseDevice {
  type: "gan_icarry";
  deviceName: string;
  hardwareVersion: string;
  softwareVersion: string;
  bluetoothAddress: string;
  macAddress: string;
  batteryLevel: number; // Percentage (0-100)
  hasGyroscope: boolean;
  isConnected: boolean;
  lastFacelet: CubieCube;
  currentFacelet: CubieCube;
}

// QiYi Timer (Bluetooth)
export interface IQiYiSmartTimerDevice extends BaseDevice {
  type: "qiyi_smart_timer";
  hardwareVersion: string;
  softwareVersion: string;
  bluetoothAddress: string;
  macAddress: string;
  batteryLevel: number; // Percentage (0-100)
  isConnected: boolean;
}

// Stackmat timer
export type StackmatSignalHeader = "I" | "S" | "L" | "R" | "A" | "C" | " ";

export type StackmatCallback = (e: StackmatState) => void;

export interface StackmatState {
  device: string;
  time_milli: number;
  unit: number;
  on: boolean;
  greenLight: boolean;
  leftHand: boolean;
  rightHand: boolean;
  running: boolean;
  unknownRunning: boolean;
  signalHeader: StackmatSignalHeader;
  noise: number;
  power: number;
}

export interface IStackmatDevice extends BaseDevice {
  type: "stackmat";
  isConnected: boolean;
  lastState: StackmatState | null;
}

type KEY =
  | "Q"
  | "W"
  | "E"
  | "R"
  | "T"
  | "Y"
  | "U"
  | "I"
  | "O"
  | "P"
  | "A"
  | "S"
  | "D"
  | "F"
  | "G"
  | "H"
  | "J"
  | "K"
  | "L"
  | "Z"
  | "X"
  | "C"
  | "V"
  | "B"
  | "N"
  | "M";

type KeyMap = Partial<Record<KEY | (string & {}), string>>;

// Keyboard for controlling a virtual cube
export interface IVirtualCubeKeyboardDevice extends BaseDevice {
  type: "virtual_cube_keyboard";
  keyBindings: KeyMap; // Mapping of keys to moves
}

// External timer over the network
export interface IExternalTimerDevice extends BaseDevice {
  type: "network_timer";
  ipAddress: string;
  port: number;
}

// USB Timer
export interface IUSBTimerDevice extends BaseDevice {
  type: "usb_timer";
  usbPort: string;
}

// Union type for all device types
export type IDevice =
  | ITimerKeyboardDevice
  | IManualTimeEntryDevice
  | IGANiCarryDevice
  | IStackmatDevice
  | IVirtualCubeKeyboardDevice
  | IExternalTimerDevice
  | IUSBTimerDevice
  | IQiYiSmartTimerDevice;
