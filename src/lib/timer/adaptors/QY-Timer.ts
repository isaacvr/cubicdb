import type { IQiYiSmartTimerDevice } from "$lib/interfaces/devices.types";
import { getUint8DataView } from "@helpers/object";
import { randomUUID } from "@helpers/strings";
import type { InputContext } from "@interfaces";

function logUint8Array(data: Uint8Array) {
  const arr = Array.from(data);

  return arr.map(n => "0x" + ("00" + n.toString(16)).slice(-2)).join(" ");
}

export const BLUETOOTH_FILTERS = {
  filters: [
    {
      namePrefix: "QY-Timer",
    },
  ],
  optionalServices: [
    "5833ff01-9b8b-5191-6142-22a4536ef123",
    "0000fd50-0000-1000-8000-00805f9b34fb",
    "00001801-0000-1000-8000-00805f9b34fb",
    "00001800-0000-1000-8000-00805f9b34fb",
    "0000fd50-0000-1000-8000-00805f9b34fb",
  ],
};

export class QiYiSmartTimerInput implements IQiYiSmartTimerDevice {
  readonly type = "qiyi_smart_timer";
  private device: BluetoothDevice | null;

  id = "";
  name = "QiYi Timer";

  batteryLevel = 0;
  bluetoothAddress = "";
  enabled = false;
  hardwareVersion = "";
  isConnected = false;
  macAddress = "";
  softwareVersion = "";

  constructor() {
    this.device = null;
    this.id = randomUUID();
  }

  static get QY_PRIMARY_SERVICE() {
    return "0000fd50-0000-1000-8000-00805f9b34fb";
  }

  static get BLUETOOTH_FILTERS(): RequestDeviceOptions {
    return BLUETOOTH_FILTERS;
  }

  init(context: InputContext) {}

  disconnect() {
    if (!this.isConnected) return;
    this.device?.gatt?.disconnect();
    this.isConnected = false;
  }

  keyUpHandler() {}
  keyDownHandler() {}
  stopTimer() {}

  async fromDevice(device: BluetoothDevice): Promise<string> {
    this.disconnect();

    this.device = device;
    this.macAddress = localStorage.getItem("bluetooth-mac") || "";

    console.log("[QY-Timer] deviceMac: ", this.macAddress);

    let server: BluetoothRemoteGATTServer | undefined;

    try {
      server = await device.gatt?.connect();
    } catch (err) {
      console.log("Connect err: ", err);
      return "";
    }

    if (!server) return "";

    console.log("SERVER: ", server);

    try {
      const service = await server.getPrimaryService(QiYiSmartTimerInput.QY_PRIMARY_SERVICE);

      console.log("SERVICE: ", service);

      const c1 = await service.getCharacteristic("00000001-0000-1001-8001-00805f9b07d0");

      const val1 = [
        0x00, 0x21, 0x40, 0x00, 0xb1, 0x84, 0xec, 0x1d, 0xd4, 0x5d, 0x0c, 0xc8, 0x25, 0xb1, 0x58,
        0x66, 0x4e, 0x35, 0x0c, 0x03,
      ];
      const val2 = [
        0x01, 0x2c, 0xdb, 0xdc, 0x10, 0x5e, 0x47, 0xea, 0x3f, 0xc1, 0x01, 0x7b, 0xa3, 0x7c, 0xa3,
        0xb3, 0x66,
      ];

      console.log(val1, val2);

      await c1.writeValueWithResponse(Uint8Array.from(val1));
      await c1.writeValueWithResponse(Uint8Array.from(val2));
    } catch (err) {
      console.log("[QY-Timer] primary service error: ", err);
    }

    // return '';

    ///*

    let services: BluetoothRemoteGATTService[] | undefined;

    try {
      services = await server.getPrimaryServices();
    } catch (err) {
      console.log("[QY-Timer] getPrimaryServices error: ", err);
    }

    if (!services) {
      this.disconnect();
      return "";
    }

    for (let i = 0, maxi = services.length; i < maxi; i += 1) {
      const cv = await services[i].getCharacteristics();

      console.log(`CHAR [${services[i].uuid}] => `, cv);

      for (let j = 0, maxj = cv.length; j < maxj; j += 1) {
        const p = cv[j].properties;

        if (p.read) {
          console.log(
            `READ [${services[i].uuid}] / [${cv[j].uuid}] => `,
            logUint8Array(getUint8DataView(await cv[j].readValue()))
          );
        }

        if (p.notify) {
          let lastEvent = performance.now();

          cv[j].addEventListener("characteristicvaluechanged", ev => {
            const curEvent = performance.now();

            console.log(curEvent - lastEvent);

            lastEvent = curEvent;

            // @ts-ignore
            console.log("data: ", logUint8Array(getUint8DataView(ev.target.value)));
            // console.log(`[${ services[i].uuid }] / [${ cv[j].uuid }] => `, ev);
          });

          cv[j].startNotifications();
        }
      }
    }

    return "";
    //*/
  }

  newRecord() {}
  sendEvent() {}

  fromJSON(config: Record<string, any>) {}
  toJSON() {
    return {};
  }
}
