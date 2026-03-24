import { AES128 } from "@classes/AES128";
import { AlgorithmSequence } from "@classes/AlgorithmSequence";
import { CFOP } from "@classes/reconstructors/CFOP";
import { Roux } from "@classes/reconstructors/Roux";
import { CubieCube, SOLVED_FACELET, valuedArray } from "@cstimer/lib/mathlib";
import { isEscape, type Actor } from "@helpers/stateMachine";
import {
  TimerState,
  type InputContext,
  type ITimerController,
  type Solve,
  Penalty,
  type BluetoothDeviceData,
  type Callback,
} from "@interfaces";
import { get, writable, type Writable } from "svelte/store";
import { createActor, setup, fromCallback } from "xstate";
import { decompressFromBase64 } from "$lib/helpers/decompress-string";
import { dataService } from "$lib/data-services/data.service";
import type { IGANiCarryDevice } from "$lib/interfaces/devices.types";
import { weakRandomUUID } from "@helpers/strings";
import { Emitter } from "@classes/Emitter";

let solvedState = SOLVED_FACELET;

interface GANContext {
  input: InputContext & ITimerController;
  sequencer: AlgorithmSequence;
  sequenceParts: Writable<string[]>;
  recoverySequence: Writable<string>;
  moves: string[];
  cfop: CFOP;
  roux: Roux;
}

type GANActor = (data: Actor<GANContext>) => any;

const debug = false;

function matchUUID(uuid1: string, uuid2: string) {
  return uuid1.toUpperCase() == uuid2.toUpperCase();
}

function updateSequence(seq: AlgorithmSequence) {
  return {
    parts: [
      seq.scramble.slice(0, seq.cursor).join(" "),
      seq.scramble.slice(seq.cursor, seq.cursor + 1).join(" "),
      seq.scramble.slice(seq.cursor + 1).join(" "),
    ],
    recovery: seq.getRecoveryScramble(),
  };
}

function logSequenceParts(p: string[]) {
  console.log("PARTS: ", p);
}

// Guards
const isScrambled: GANActor = ({ context, event }) => {
  const seq = context.sequencer;
  seq.feed(event.data.move.trim());

  const { parts, recovery } = updateSequence(seq);

  context.sequenceParts.set(parts);
  context.recoverySequence.set(recovery);
  logSequenceParts(get(context.sequenceParts));

  debug &&
    console.log(
      "Feed sequencer: ",
      event.data.move,
      `${seq.cursor} / ${seq.scramble.length}`,
      seq.recovery
    );

  return seq.done();
};

const isOwn: GANActor = ({ context }) => {
  return context.sequencer.beyondScramble();
};

const isCompleteCube: GANActor = ({ event }) => {
  debug && console.log("FACELET_SOLVED: ", event.data.facelet, event.data.facelet === solvedState);
  return event.data.facelet === solvedState;
};

const isScrambleReady: GANActor = ({ context }) => {
  if (context.sequencer.scramble.length) {
    let {} = updateSequence(context.sequencer);
    return true;
  }

  return false;
};

// Flow control
const enterConnected: GANActor = ({ context, event }) => {
  const {
    input: { timerState: state, time, decimals, scramble },
    moves,
    sequencer,
    cfop,
    roux,
  } = context;

  sequencer.clear();
  moves.length = 0;

  const scr = event?.data?.scramble || get(scramble);
  sequencer.setScramble(scr);
  cfop.setSequence(scr);
  roux.setSequence(scr);

  const { parts, recovery } = updateSequence(sequencer);

  context.sequenceParts.set(parts);
  context.recoverySequence.set(recovery);
  logSequenceParts(get(context.sequenceParts));

  debug && console.log("[enterConnected]: ", event, scr);

  state.set(TimerState.CLEAN);
  time.set(0);
  decimals.set(true);
};

const enterDisconnect: GANActor = ({ context: { input } }) => {
  debug && console.log("[enterDisconnect]");
  input.timerState.set(TimerState.CLEAN);
};

const setReady: GANActor = ({ context: { input } }) => {
  debug && console.log("[setReady]");
  input.createNewSolve();
  input.timerState.set(TimerState.CLEAN);
};

const setTimerInspection = fromCallback(
  ({
    input: {
      input: { timerState: state, ready, decimals, session, lastSolve, time, addSolve },
    },
    sendBack,
  }: {
    input: GANContext;
    sendBack: any;
  }) => {
    state.set(TimerState.INSPECTION);
    ready.set(false);
    decimals.set(false);

    const { settings } = get(session);

    if (!settings.hasInspection) {
      return sendBack({ type: "RUN" });
    }

    const ref =
      performance.now() + (settings.hasInspection ? (settings.inspection || 15) * 1000 : 0);
    const ls = get(lastSolve) as Solve;

    const itv = setInterval(() => {
      const t = Math.round((ref - performance.now()) / 1000) * 1000;

      if (t < -2000) {
        sendBack({ type: "DNF" });
        lastSolve.set(Object.assign(ls, { penalty: Penalty.DNF }));
        addSolve(Infinity, Penalty.DNF);
        return;
      }

      if (t <= 0 && ls?.penalty === Penalty.NONE) {
        lastSolve.set(Object.assign(ls, { penalty: Penalty.P2 }));
      }

      time.set(~~t);
    });

    return () => {
      clearInterval(itv);
    };
  }
);

const setTimerRunner = fromCallback(
  ({
    input: {
      input: { timerState: state, decimals, lastSolve, time },
    },
  }: {
    input: GANContext;
    sendBack: any;
  }) => {
    decimals.set(true);
    state.set(TimerState.RUNNING);

    const ref = performance.now() - (get(lastSolve)?.penalty === Penalty.P2 ? 2000 : 0);
    const itv = setInterval(() => time.set(performance.now() - ref));

    return () => {
      const p = performance.now();
      clearInterval(itv);
      time.set(p - ref);
    };
  }
);

const saveSolve = fromCallback(
  ({
    input: {
      input: { timerState: state, lastSolve, time, addSolve, initScrambler },
      sequencer,
      cfop,
      roux,
    },
  }: {
    input: GANContext;
    sendBack: any;
  }) => {
    //   ({
    //   input: { time, state, lastSolve, addSolve, initScrambler },
    //   sequencer,
    //   cfop,
    //   roux,
    // }: GANContext) => {
    const t = get(time);

    Promise.all([cfop.getAnalysis(t), roux.getAnalysis(t)]).then(res =>
      get(dataService).emitBluetoothData("reconstructor", res)
    );

    state.set(TimerState.STOPPED);
    sequencer.clear();
    initScrambler();

    const ls = get(lastSolve) as Solve;

    t > 0 && addSolve(t, ls?.penalty);
    time.set(0);
  }
);

const handleOwnEntry: GANActor = ({ context }) => {
  context.sequenceParts.set(["", "On your own", ""]);
  context.recoverySequence.set("");
  logSequenceParts(get(context.sequenceParts));
};

const GANMachine = setup({
  types: {
    context: {} as GANContext,
  },
  actors: {
    setTimerInspection,
    setTimerRunner,
    saveSolve,
  },
}).createMachine({
  context: ({ input }) => input as GANContext,
  initial: "DISCONNECTED",
  states: {
    DISCONNECTED: {
      entry: enterDisconnect,
      on: {
        CONNECT: "CONNECTED",
      },
    },

    CONNECTED: {
      entry: enterConnected,
      on: {
        MOVE: {
          target: "SCRAMBLE",
          guard: isScrambleReady,
        },
      },
    },

    SCRAMBLE: {
      entry: [isScrambled, setReady],
      on: {
        MOVE: [
          {
            target: "INSPECTION",
            guard: isScrambled,
          },
          {
            target: "OWN",
            guard: isOwn,
          },
        ],
      },
    },

    INSPECTION: {
      invoke: {
        src: "setTimerInspection",
        input: ({ context }) => context,
      },
      on: {
        keydown: [
          {
            target: "CONNECTED",
            guard: isEscape<GANContext>,
          },
        ],

        MOVE: "RUNNING",
        DNF: "STOPPED",
      },
    },

    RUNNING: {
      invoke: {
        src: "setTimerRunner",
        input: ({ context }) => context,
      },

      on: {
        keydown: [
          {
            target: "CONNECTED",
            guard: isEscape<GANContext>,
          },
        ],

        MOVE: {
          target: "STOPPED",
          guard: isCompleteCube,
        },
      },
    },

    STOPPED: {
      invoke: {
        src: "saveSolve",
        input: ({ context }) => context,
      },
      on: {
        keydown: {
          target: "CONNECTED",
          guard: isEscape,
        },

        MOVE: {
          target: "SCRAMBLE",
        },
      },
    },

    OWN: {
      entry: handleOwnEntry,
      on: {
        MOVE: {
          target: "AFTEROWN",
          guard: isCompleteCube,
        },
      },
    },

    AFTEROWN: {
      entry: ({ context: { input, sequencer } }) => {
        input.initScrambler();
        input.time.set(0);
        input.timerState.set(TimerState.CLEAN);
        sequencer.clear();
      },
      always: "CONNECTED",
    },
  },
  on: {
    DISCONNECTED: ".DISCONNECTED",
  },
});

export const BLUETOOTH_FILTERS = {
  filters: [
    {
      namePrefix: "GAN",
    },
  ],
  // optionalServices: GANInput.opServices(),
  optionalServices: [
    "00001800-0000-1000-8000-00805f9b34fb",
    "00001801-0000-1000-8000-00805f9b34fb",
    "6e400001-b5a3-f393-e0a9-e50e24dc4179",
    "f95a48e6-a721-11e9-a2a3-022ae2dbcce4",
  ],
};

export class GANInput implements IGANiCarryDevice {
  private decoder: AES128 | null;
  private device: BluetoothDevice | null;
  private service_meta: BluetoothRemoteGATTService | null;
  private service_data: BluetoothRemoteGATTService | null;
  private service_v2data: BluetoothRemoteGATTService | null;
  private chrct_v2read: BluetoothRemoteGATTCharacteristic | null;
  private chrct_v2write: BluetoothRemoteGATTCharacteristic | null;
  private prevMoves: string[];
  private timeOffs: number[];
  private latestFacelet: string;
  private deviceTime: number;
  private moveCnt: number;
  private prevMoveCnt: number;
  private keyCheck: number;
  private deviceTimeOffset: number;
  private movesFromLastCheck: number;
  private moves: string[];
  private context: GANContext | null;
  private emitter: Emitter = new Emitter();
  sequenceParts: Writable<string[]> = writable([]);
  recoverySequence: Writable<string> = writable("");

  readonly type = "gan_icarry";

  id = weakRandomUUID();
  name = "GAN iCarry";
  deviceName = "";
  hardwareVersion = "";
  softwareVersion = "";
  currentFacelet = new CubieCube();
  lastFacelet = new CubieCube();
  enabled = false;
  hasGyroscope = false;

  macAddress = "";
  sequencer: AlgorithmSequence;
  batteryLevel: number;
  isConnected: boolean;
  interpreter: ReturnType<typeof createActor> | null;

  constructor() {
    this.sequencer = new AlgorithmSequence();
    this.moves = [];
    this.context = null;
    this.interpreter = null;
    this.decoder = null;

    this.service_meta = null;
    this.service_data = null;
    this.service_v2data = null;
    this.chrct_v2read = null;
    this.chrct_v2write = null;
    this.device = null;
    this.macAddress = "";
    this.prevMoves = [];
    this.timeOffs = [];
    this.lastFacelet = new CubieCube();
    this.currentFacelet = new CubieCube();
    this.latestFacelet = solvedState;
    this.deviceTime = 0;
    this.moveCnt = 0;
    this.prevMoveCnt = -1;
    this.batteryLevel = 0;
    this.keyCheck = 0;
    this.deviceTimeOffset = 0;
    this.movesFromLastCheck = 1000;
    this.isConnected = false;
  }

  get bluetoothAddress() {
    return this.macAddress;
  }

  get strFacelet() {
    return this.latestFacelet;
  }

  static get UUID_SUFFIX() {
    return "-0000-1000-8000-00805f9b34fb";
  }

  static get SERVICE_UUID_META() {
    return "0000180a" + GANInput.UUID_SUFFIX;
  }

  static get CHRCT_UUID_VERSION() {
    return "00002a28" + GANInput.UUID_SUFFIX;
  }

  static get CHRCT_UUID_HARDWARE() {
    return "00002a23" + GANInput.UUID_SUFFIX;
  }

  static get SERVICE_UUID_DATA() {
    return "0000fff0" + GANInput.UUID_SUFFIX;
  }

  static get SERVICE_UUID_V2DATA() {
    return "6e400001-b5a3-f393-e0a9-e50e24dc4179";
  }

  static get CHRCT_UUID_V2READ() {
    return "28be4cb6-cd67-11e9-a32f-2a2ae2dbcce4";
  }

  static get CHRCT_UUID_V2WRITE() {
    return "28be4a4a-cd67-11e9-a32f-2a2ae2dbcce4";
  }

  static get GAN_CIC_LIST() {
    return [0x0001, 0x0501];
  }

  static get CHRCT_UUID_F2() {
    return "0000fff2" + GANInput.UUID_SUFFIX; // cube state, (54 - 6) facelets, 3 bit per facelet
  }

  static get CHRCT_UUID_F3() {
    return "0000fff3" + GANInput.UUID_SUFFIX; // prev moves
  }

  static get CHRCT_UUID_F5() {
    return "0000fff5" + GANInput.UUID_SUFFIX; // gyro state, move counter, pre moves
  }

  static get CHRCT_UUID_F6() {
    return "0000fff6" + GANInput.UUID_SUFFIX; // move counter, time offsets between premoves
  }

  static get CHRCT_UUID_F7() {
    return "0000fff7" + GANInput.UUID_SUFFIX;
  }

  static get opServices() {
    return [GANInput.SERVICE_UUID_DATA, GANInput.SERVICE_UUID_META];
  }

  private static get KEYS() {
    return [
      "NoRgnAHANATADDWJYwMxQOxiiEcfYgSK6Hpr4TYCs0IG1OEAbDszALpA",
      "NoNg7ANATFIQnARmogLBRUCs0oAYN8U5J45EQBmFADg0oJAOSlUQF0g",
      "NoRgNATGBs1gLABgQTjCeBWSUDsYBmKbCeMADjNnXxHIoIF0g",
      "NoRg7ANAzBCsAMEAsioxBEIAc0Cc0ATJkgSIYhXIjhMQGxgC6QA",
      "NoVgNAjAHGBMYDYCcdJgCwTFBkYVgAY9JpJYUsYBmAXSA",
      "NoRgNAbAHGAsAMkwgMyzClH0LFcArHnAJzIqIBMGWEAukA",
    ];
  }

  static get BLUETOOTH_FILTERS() {
    return BLUETOOTH_FILTERS;
  }

  init(context: InputContext) {
    const fullContext = { ...context, ...context.timerController };
    this.context = {
      input: fullContext,
      moves: this.moves,
      sequencer: this.sequencer,
      recoverySequence: this.recoverySequence,
      sequenceParts: this.sequenceParts,
      cfop: new CFOP(),
      roux: new Roux(),
    };
    this.interpreter = createActor(GANMachine, { input: this.context });
    this.interpreter.start();
    this.interpreter.subscribe(ev => {
      console.log("STATE: ", ev);
    });
  }

  disconnect() {
    console.log("DISCONNECTING");
    console.trace();
    this.sequencer.clear();
    this.sequenceParts.set([]);
    this.recoverySequence.set("");

    get(dataService).off("scramble", this.handleScramble);
    this.interpreter?.send({
      type: "DISCONNECTED",
    });

    this.device?.gatt?.disconnect();
    this.isConnected = false;

    this.interpreter?.stop();
    get(dataService).emitBluetoothData("disconnect", null);
  }

  keyUpHandler(ev: KeyboardEvent) {
    // if (ev.code === "KeyI") {
    //   this.connected = true;
    //   this.emit("connect", null);
    //   if (this.interpreter.getSnapshot().status != "active") {
    //     this.init();
    //   }
    //   this.interpreter.send({
    //     type: "CONNECT",
    //     data: {
    //       scramble: get(this.context.input.scramble),
    //     },
    //   });
    // } else if (ev.code === "KeyO") {
    //   this.disconnect();
    // }
    // if (!this.connected) return;
    // if (!/^Key[RUFDLBMSEXYZ]/.test(ev.code)) return;
    // let mv = ev.code.slice(3) + (ev.shiftKey ? "'" : "");
    // let move = /^[XYZ]/.test(mv) ? mv.toLowerCase() : mv;
    // this.interpreter.send({
    //   type: "MOVE",
    //   data: {
    //     move,
    //     offset: 0,
    //     facelet: solvedState,
    //   },
    // });
    // this.emit("move", [move, 200]);
  }

  keyDownHandler(ev: KeyboardEvent) {
    if (!this.isConnected) return;
    this.interpreter?.send(ev);
  }

  stopTimer() {}

  on(cb: Callback) {
    this.emitter.on("*", cb);
  }

  off(cb: Callback) {
    this.emitter.off("*", cb);
  }

  private handleScramble(s: string) {
    const ctx = this.context;
    if (!ctx) return;

    ctx.sequencer.setScramble(s);
    ctx.cfop.setSequence(s);
    ctx.roux.setSequence(s);
    const { parts, recovery } = updateSequence(ctx.sequencer);
    ctx.sequenceParts.set(parts);
    ctx.recoverySequence.set(recovery);
    logSequenceParts(get(ctx.sequenceParts));
  }

  async fromDevice(device: BluetoothDevice, macAddress = ""): Promise<string> {
    this.clear();
    this.disconnect();

    this.device = device;
    this.macAddress = macAddress || device.id;

    let server: BluetoothRemoteGATTServer | undefined;

    try {
      server = await device.gatt?.connect();
    } catch (err) {
      // debug && console.log("Connect err: ", err);
      return "";
    }

    const services: BluetoothRemoteGATTService[] | undefined = await server?.getPrimaryServices();

    if (!services) {
      this.disconnect();
      return "";
    }

    for (let i = 0, maxi = services?.length || 0; i < maxi; i++) {
      const service = services[i];
      if (matchUUID(service.uuid, GANInput.SERVICE_UUID_META)) {
        this.service_meta = service;
      } else if (matchUUID(service.uuid, GANInput.SERVICE_UUID_DATA)) {
        this.service_data = service;
      } else if (matchUUID(service.uuid, GANInput.SERVICE_UUID_V2DATA)) {
        this.service_v2data = service;
      }
    }

    if (this.service_v2data) {
      const res = await this.v2init((device.name || "").startsWith("AiCube") ? 1 : 0);

      if (res) {
        this.isConnected = true;
        this.interpreter?.start();
        this.emitter.emit("connect");

        device.addEventListener("gattserverdisconnected", () => {
          this.disconnect();
        });

        // if (this.interpreter.getSnapshot().status != "active") {
        get(dataService).off("scramble", this.handleScramble);
        get(dataService).on("scramble", this.handleScramble.bind(this));
        // }

        this.interpreter?.send({
          type: "CONNECT",
          data: {
            scramble: get(this.context!.input.scramble),
          },
        });

        console.log("CONNECTING");

        return this.macAddress;
      }

      this.disconnect();
      return "";
    }

    if (this.service_data && this.service_meta) {
      // return this.v1init();
    }

    return "";
  }

  private clear() {
    this.service_data = null;
    this.service_meta = null;
    this.service_v2data = null;

    let result: Promise<any> = Promise.resolve();

    if (this.chrct_v2read) {
      this.chrct_v2read.removeEventListener("characteristicvaluechanged", this.onStateChangedV2);
      result = this.chrct_v2read.stopNotifications().catch(() => {});
      this.chrct_v2read = null;
    }

    this.macAddress = "";
    this.prevMoves = [];
    this.timeOffs = [];
    this.lastFacelet = new CubieCube();
    this.currentFacelet = new CubieCube();
    this.latestFacelet = solvedState;
    this.deviceTime = 0;
    this.prevMoveCnt = -1;
    this.batteryLevel = 100;
    return result;
  }

  private async v2initDecoder(mac: string, ver: any) {
    const value: number[] = [];

    for (let i = 0; i < 6; i++) {
      value.push(parseInt(mac.slice(i * 3, i * 3 + 2), 16));
    }

    const keyiv = await this.getKeyV2(value, ver);

    // debug && console.log("[gancube] ver=", ver, " key=", JSON.stringify(keyiv));

    this.decoder = new AES128(keyiv[0]);
    this.decoder.iv = keyiv[1];
  }

  private encode(ret: any[]) {
    if (this.decoder == null) {
      return ret;
    }

    const iv = this.decoder.iv || [];

    for (let i = 0; i < 16; i++) {
      ret[i] ^= ~~iv[i];
    }

    this.decoder.encrypt(ret);

    if (ret.length > 16) {
      const offset = ret.length - 16;
      const block = ret.slice(offset);

      for (let i = 0; i < 16; i++) {
        block[i] ^= ~~iv[i];
      }

      this.decoder.encrypt(block);

      for (let i = 0; i < 16; i++) {
        ret[i + offset] = block[i];
      }
    }
    return ret;
  }

  private v2sendRequest(req: any[]) {
    if (!this.chrct_v2write) {
      // debug && console.log("[gancube] v2sendRequest cannot find v2write chrct");
      return;
    }

    const encodedReq = this.encode(req.slice());

    // debug && console.log("[gancube] v2sendRequest", req, encodedReq);
    return this.chrct_v2write.writeValue(new Uint8Array(encodedReq).buffer);
  }

  private v2sendSimpleRequest(opcode: number) {
    const req = valuedArray(20, 0);
    req[0] = opcode;
    return this.v2sendRequest(req);
  }

  private v2requestFacelets() {
    return this.v2sendSimpleRequest(4);
  }

  private v2requestBattery() {
    return this.v2sendSimpleRequest(9);
  }

  private v2requestHardwareInfo() {
    return this.v2sendSimpleRequest(5);
  }

  private onStateChangedV2(event: any) {
    const value = event.target.value;

    if (this.decoder == null) {
      return;
    }

    this.parseV2Data(value);
  }

  private initCubeState() {
    // let locTime = $.now();
    // debug && console.log("[gancube]", "init cube state");
    // callback(latestFacelet, prevMoves, [null, locTime], deviceName);
    // debug && console.log("Prev facelet: ", this.latestFacelet);
    this.lastFacelet.fromFacelet(this.latestFacelet);
    this.prevMoveCnt = this.moveCnt;
  }

  private updateMoveTimes(locTime: number) {
    let moveDiff = (this.moveCnt - this.prevMoveCnt) & 0xff;

    moveDiff > 1 &&
      debug &&
      console.log("[gancube]", "bluetooth event was lost, moveDiff = " + moveDiff);

    this.prevMoveCnt = this.moveCnt;

    this.movesFromLastCheck += moveDiff;

    if (moveDiff > this.prevMoves.length) {
      this.movesFromLastCheck = 50;
      moveDiff = this.prevMoves.length;
    }

    let calcTs = this.deviceTime + this.deviceTimeOffset;

    for (let i = moveDiff - 1; i >= 0; i--) {
      calcTs += this.timeOffs[i];
    }

    if (Math.abs(locTime - calcTs) > 2000) {
      debug && console.log("[gancube]", "time adjust", locTime - calcTs, "@", locTime);
      this.deviceTime += locTime - calcTs;
    }

    for (let i = moveDiff - 1; i >= 0; i--) {
      const m = "URFDLB".indexOf(this.prevMoves[i][0]) * 3 + " 2'".indexOf(this.prevMoves[i][1]);
      CubieCube.EdgeMult(this.lastFacelet, CubieCube.moveCube[m], this.currentFacelet);
      CubieCube.CornMult(this.lastFacelet, CubieCube.moveCube[m], this.currentFacelet);
      this.deviceTime += this.timeOffs[i];
      const tmp = this.currentFacelet;
      this.currentFacelet = this.lastFacelet;
      this.lastFacelet = tmp;

      debug && console.log("[gancube] move", this.prevMoves[i], this.timeOffs[i]);
      debug &&
        console.log(
          "[gancube] facelet: ",
          this.lastFacelet.toFaceCube(),
          this.currentFacelet.toFaceCube()
        );

      this.interpreter?.send({
        type: "MOVE",
        data: {
          move: this.prevMoves[i],
          offset: this.timeOffs[i],
          facelet: this.lastFacelet.toFaceCube(),
        },
      });

      const st = this.interpreter?.getSnapshot().value.toString();

      if (st === "RUNNING" || st === "STOPPED") {
        this.context?.cfop.addMove(this.prevMoves[i]);
        this.context?.roux.addMove(this.prevMoves[i]);
      }

      this.emitter.emit("move", [this.prevMoves[i], this.timeOffs[i]]);
    }

    this.deviceTimeOffset = locTime - this.deviceTime;
  }

  private parseV2Data(value: any) {
    const locTime = Date.now();

    value = this.decode(value);

    for (let i = 0; i < value.length; i++) {
      value[i] = (value[i] + 256).toString(2).slice(1);
    }

    value = value.join("");

    const mode = parseInt(value.slice(0, 4), 2);

    if (mode == 1) {
      // gyro
    } else if (mode == 2) {
      // cube move
      this.moveCnt = parseInt(value.slice(4, 12), 2);

      if (this.moveCnt == this.prevMoveCnt) {
        return;
      } else if (this.prevMoveCnt == -1) {
        this.prevMoveCnt = this.moveCnt;
        return;
      }

      this.timeOffs = [];
      this.prevMoves = [];

      let keyChkInc = 0;

      for (let i = 0; i < 7; i++) {
        const m = parseInt(value.slice(12 + i * 5, 17 + i * 5), 2);
        this.timeOffs[i] = parseInt(value.slice(47 + i * 16, 63 + i * 16), 2);
        this.prevMoves[i] = "URFDLB".charAt(m >> 1) + " '".charAt(m & 1);

        if (m >= 12) {
          // invalid data
          this.prevMoves[i] = "U ";
          keyChkInc = 1;
        }
      }

      this.keyCheck += keyChkInc;

      if (keyChkInc == 0) {
        this.updateMoveTimes(locTime);
      }
    } else if (mode == 4) {
      // cube state
      debug && console.log("[gancube]", "v2 received facelets event");

      this.moveCnt = parseInt(value.slice(4, 12), 2);

      if (this.moveCnt != this.prevMoveCnt && this.prevMoveCnt != -1) {
        return;
      }

      const cc = new CubieCube();
      let echk = 0;
      let cchk = 0xf00;

      for (let i = 0; i < 7; i++) {
        const perm = parseInt(value.slice(12 + i * 3, 15 + i * 3), 2);
        const ori = parseInt(value.slice(33 + i * 2, 35 + i * 2), 2);
        cchk -= ori << 3;
        cchk ^= perm;
        cc.ca[i] = (ori << 3) | perm;
      }

      cc.ca[7] = (cchk & 0xff8) % 24 | (cchk & 0x7);

      for (let i = 0; i < 11; i++) {
        const perm = parseInt(value.slice(47 + i * 4, 51 + i * 4), 2);
        const ori = parseInt(value.slice(91 + i, 92 + i), 2);
        echk ^= (perm << 1) | ori;
        cc.ea[i] = (perm << 1) | ori;
      }

      cc.ea[11] = echk;

      if (cc.verify() != 0) {
        this.keyCheck++;
        return;
      }

      this.latestFacelet = cc.toFaceCube();

      debug && console.log("FACELET: ", this.latestFacelet);

      this.emitter.emit("facelet", this.latestFacelet);

      if (this.prevMoveCnt == -1) {
        this.initCubeState();
      } else if (this.lastFacelet.toFaceCube() != this.latestFacelet) {
        debug && console.log("[gancube]", "Cube state check error");
        debug && console.log("[gancube]", "calc", this.lastFacelet.toFaceCube());
        debug && console.log("[gancube]", "read", this.latestFacelet);
        this.lastFacelet.fromFacelet(this.latestFacelet);
        // callback(latestFacelet, prevMoves, [null, locTime], deviceName + '*');
      }
      this.prevMoveCnt = this.moveCnt;
    } else if (mode == 5) {
      // hardware info
      debug && console.log("[gancube]", "v2 received hardware info event", value);
      debug && console.log("[gancube]", "v2 received hardware info event");
      const hardwareVersion =
        parseInt(value.slice(8, 16), 2) + "." + parseInt(value.slice(16, 24), 2);
      const softwareVersion =
        parseInt(value.slice(24, 32), 2) + "." + parseInt(value.slice(32, 40), 2);
      let deviceName = "";

      for (let i = 0; i < 8; i++) {
        deviceName += String.fromCharCode(parseInt(value.slice(40 + i * 8, 48 + i * 8), 2));
      }

      const gyro = 1 === parseInt(value.slice(104, 105), 2);

      debug && console.log("[gancube]", "Hardware Version", hardwareVersion);
      debug && console.log("[gancube]", "Software Version", softwareVersion);
      debug && console.log("[gancube]", "Device Name", deviceName);
      debug && console.log("[gancube]", "Gyro Enabled", gyro);

      this.deviceName = deviceName;
      this.hasGyroscope = gyro;
      this.hardwareVersion = hardwareVersion;
      this.softwareVersion = softwareVersion;

      this.emitter.emit("hardware", { hardwareVersion, softwareVersion, deviceName, gyro });
    } else if (mode == 9) {
      // battery
      this.batteryLevel = parseInt(value.slice(8, 16), 2);
      this.emitter.emit("battery", this.batteryLevel);
      debug && console.log("[gancube]", "v2 received battery event", this.batteryLevel);
    } else {
      debug && console.log("[gancube]", "v2 received unknown event", value);
    }
  }

  private decode(value: DataView) {
    const ret = [];

    for (let i = 0; i < value.byteLength; i++) {
      ret[i] = value.getUint8(i);
    }

    if (this.decoder == null) {
      return ret;
    }
    const iv = this.decoder.iv || [];
    if (ret.length > 16) {
      const offset = ret.length - 16;
      const block = this.decoder.decrypt(ret.slice(offset));
      for (let i = 0; i < 16; i++) {
        ret[i + offset] = block[i] ^ ~~iv[i];
      }
    }

    this.decoder.decrypt(ret);

    for (let i = 0; i < 16; i++) {
      ret[i] ^= ~~iv[i];
    }
    return ret;
  }

  // private async getKey(version: number, value: DataView) {
  //   let key = GANInput.KEYS[(version >> 8) & 0xff];

  //   if (!key) {
  //     return;
  //   }

  //   let k: number[] = JSON.parse(await decompressFromBase64(key));

  //   for (let i = 0; i < 6; i++) {
  //     k[i] = (k[i] + value.getUint8(5 - i)) & 0xff;
  //   }

  //   return k;
  // }

  private async getKeyV2(value: number[], ver: any): Promise<number[][]> {
    const v = ver || 0;
    const key = JSON.parse(await decompressFromBase64(GANInput.KEYS[2 + v * 2]));
    const iv = JSON.parse(await decompressFromBase64(GANInput.KEYS[3 + v * 2]));
    for (let i = 0; i < 6; i++) {
      key[i] = (key[i] + value[5 - i]) % 255;
      iv[i] = (iv[i] + value[5 - i]) % 255;
    }
    return [key, iv];
  }

  private async v2init(ver: any): Promise<boolean> {
    debug && console.log("[gancube] v2init start");
    this.keyCheck = 0;

    this.v2initDecoder(this.macAddress, ver);

    if (!this.service_v2data) {
      return Promise.reject();
    }

    return this.service_v2data
      .getCharacteristics()
      .then(chrcts => {
        debug && console.log("[gancube] v2init find chrcts", chrcts);

        for (let i = 0; i < chrcts.length; i++) {
          const chrct = chrcts[i];
          debug && console.log("[gancube] v2init find chrct", chrct);
          if (matchUUID(chrct.uuid, GANInput.CHRCT_UUID_V2READ)) {
            this.chrct_v2read = chrct;
          } else if (matchUUID(chrct.uuid, GANInput.CHRCT_UUID_V2WRITE)) {
            this.chrct_v2write = chrct;
          }
        }
        if (!this.chrct_v2read) {
          debug && console.log("[gancube] v2init cannot find v2read chrct");
        }
      })
      .then(() => {
        debug && console.log("[gancube] v2init v2read start notifications");
        return this.chrct_v2read?.startNotifications();
      })
      .then(() => {
        debug && console.log("[gancube] v2init v2read notification started");
        return this.chrct_v2read?.addEventListener("characteristicvaluechanged", (e: any) => {
          this.onStateChangedV2(e);
        });
      })
      .then(() => {
        return this.v2requestHardwareInfo();
      })
      .then(() => {
        return this.v2requestFacelets();
      })
      .then(() => {
        return this.v2requestBattery();
      })
      .then(() => true);
  }

  newRecord() {}

  toJSON() {
    return {
      type: this.type,
      id: this.id,
      name: this.name,
      deviceName: this.deviceName,
      mac: this.macAddress,
      enabled: this.enabled,
      hardwareVersion: this.hardwareVersion,
      softwareVersion: this.softwareVersion,
      hasGyroscope: this.hasGyroscope,
    };
  }

  fromJSON(config: Record<string, any>, autoconnect = true) {
    const keys = [
      "id",
      "name",
      "deviceName",
      "mac",
      "hardwareVersion",
      "softwareVersion",
      "hasGyroscope",
    ];

    if (keys.some(e => !(e in config))) return null;

    this.id = config.id;
    this.name = config.name;
    this.deviceName = config.deviceName;
    this.macAddress = config.mac;
    this.hardwareVersion = config.hardwareVersion;
    this.softwareVersion = config.softwareVersion;
    this.hasGyroscope = config.hasGyroscope;
  }

  sendEvent(ev: { type: string; data?: any }) {
    if (ev.type === "sync-solved") {
      solvedState = this.latestFacelet;
      const ds = get(dataService);

      ds.emitBluetoothData("facelet", SOLVED_FACELET);
      ds.config.setPath(`timer/inputs/GAN/${this.macAddress}`, { solvedState });
      ds.config.saveConfig();
    }
  }
}

export async function reconnect(input: GANInput, deviceId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const _dataService = get(dataService);
    let resolved = false;
    const debug = false;

    _dataService.config.cancelBluetoothRequest();

    debug && console.log("setTimeout");
    const tm = setTimeout(() => {
      if (!resolved) {
        debug && console.log("Cancel request");
        _dataService.config.cancelBluetoothRequest();
      }
    }, 20000);

    function handleBluetoothEvent(...args: any[]) {
      const list: BluetoothDeviceData[] = args[1];

      if (args[0] === "device-list" && list.some(device => device.deviceId === deviceId)) {
        _dataService.off("bluetooth", handleBluetoothEvent);
        _dataService.config.connectBluetoothDevice(deviceId);
        debug && console.log("found device: ", list);
      }
    }

    function cleanup(err: any) {
      debug && console.log("cleanup");
      reject(err);
      resolved = true;
      _dataService.off("bluetooth", handleBluetoothEvent);
    }

    debug && console.log("set bluetooth listener");
    _dataService.on("bluetooth", handleBluetoothEvent);

    debug && console.log("searchBluetooth: start");
    _dataService.config
      .searchBluetooth(input, deviceId)
      .then(() => {
        debug && console.log("searchBluetooth: resolved: ", resolved);

        input.macAddress = deviceId;

        if (!resolved) {
          resolved = true;
          resolve();
          clearTimeout(tm);
          _dataService.off("bluetooth", handleBluetoothEvent);
        } else {
          cleanup(null);
        }
      })
      .catch(err => {
        cleanup(err);
        debug && console.log("searchBluetooth: catch");
      });
  });
}
