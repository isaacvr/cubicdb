import { browser } from "$app/environment";
import type {
  IStackmatDevice,
  StackmatCallback,
  StackmatState,
} from "$lib/interfaces/devices.types";
import type { Actor } from "@helpers/stateMachine";
import { randomUUID } from "@helpers/strings";
import { TimerState, type InputContext, type ITimerController } from "@interfaces";
import { get, writable, type Writable } from "svelte/store";
import { createActor, setup } from "xstate";

interface StackmatContext extends InputContext, ITimerController {
  stState: Writable<StackmatState>;
  lastState: Writable<StackmatState | null>;
}

type STActor = (data: Actor<StackmatContext>) => any;

const enterDisconnect: STActor = ({ context: { timerState: state, device } }) => {
  const _device = get(device);
  if (_device.type === "stackmat") {
    _device.isConnected = false;
  }
  state.set(TimerState.CLEAN);
};

const enterClean: STActor = ({ context: { timerState: state } }) => {
  state.set(TimerState.CLEAN);
};

const enterInspection: STActor = ({ context: { timerState: state } }) => {
  state.set(TimerState.INSPECTION);
};

const enterRunning: STActor = ({ context: { timerState: state } }) => {
  state.set(TimerState.RUNNING);
};

const enterStopped: STActor = ({ context: { timerState: state, time, addSolve } }) => {
  state.set(TimerState.STOPPED);
  addSolve(get(time));
};

const isTurnedOn: STActor = ({ context: { device, lastState, stState } }) => {
  if (!get(lastState)?.on && get(stState).on) {
    const _device = get(device);
    if (_device.type === "stackmat") {
      _device.isConnected = true;
    }
    return true;
  }

  return false;
};

const isTurnedOff: STActor = ({ context: { device, stState } }) => {
  const _device = get(device);

  if (_device.type === "stackmat") {
    if (_device.isConnected && !get(stState).on) {
      _device.isConnected = false;
      return true;
    }
  }

  return false;
};

const isRunning: STActor = ({ context: { lastState, device, stState, createNewSolve } }) => {
  if (get(stState).on && get(stState).time_milli > (get(lastState)?.time_milli || 0)) {
    createNewSolve();
    const _device = get(device);
    if (_device.type === "stackmat") {
      _device.isConnected = true;
    }
    return true;
  }

  return false;
};

const wasCleaned: STActor = ({ context: { lastState, stState, initScrambler } }) => {
  const ls = get(lastState);

  if (ls && get(stState).time_milli < ls.time_milli) {
    initScrambler();
    return true;
  }

  return false;
};

const wasStopped: STActor = ({ context: { lastState, stState } }) => {
  return get(lastState)?.running && !get(stState).running && !!get(stState).time_milli;
};

const StackmatMachine = setup({
  types: {
    context: {} as StackmatContext,
  },
}).createMachine({
  initial: "DISCONNECTED",
  context: ({ input }) => input as StackmatContext,
  states: {
    DISCONNECTED: {
      entry: enterDisconnect,
      on: {
        state: [
          { target: "RUNNING", guard: isRunning },
          { target: "CLEAN", guard: isTurnedOn },
        ],
      },
    },

    CLEAN: {
      entry: enterClean,
      on: {
        state: [
          { target: "RUNNING", guard: isRunning },
          { target: "CLEAN", guard: wasCleaned },
        ],
      },
    },

    INSPECTION: {
      entry: enterInspection,
    },

    RUNNING: {
      entry: enterRunning,
      on: {
        state: [
          { target: "STOPPED", guard: wasStopped },
          { target: "CLEAN", guard: wasCleaned },
        ],
      },
    },

    STOPPED: {
      entry: enterStopped,
      on: {
        state: [{ target: "CLEAN", guard: wasCleaned }],
      },
    },
  },

  on: {
    state: { target: ".DISCONNECTED", guard: isTurnedOff },
  },
});

export class StackmatInput implements IStackmatDevice {
  readonly type = "stackmat";
  private audio_context: AudioContext | null;
  private audio_stream: MediaStream | undefined;
  private source: MediaStreamAudioSourceNode | null = null;
  private node: AudioWorkletNode | null = null;

  name = "Stackmat";
  interpreter: ReturnType<typeof createActor> | null;
  lastState: StackmatState | null;
  isConnected: boolean;
  enabled: boolean;
  id: string;

  constructor() {
    this.interpreter = null;
    this.audio_context = browser ? new AudioContext() : null;
    this.id = randomUUID();
    this.isConnected = false;
    this.lastState = null;
    this.enabled = false;
  }

  static async updateInputDevices(): Promise<string[][]> {
    const devices: string[][] = [];
    const retobj: Promise<string[][]> = new Promise(function (resolve) {
      resolve(devices);
    });

    return navigator?.mediaDevices?.enumerateDevices().then(function (deviceInfos) {
      for (let i = 0; i < deviceInfos.length; i++) {
        const deviceInfo = deviceInfos[i];
        if (deviceInfo.kind === "audioinput") {
          devices.push([
            deviceInfo.deviceId,
            deviceInfo.label || "microphone " + (devices.length + 1),
          ]);
        }
      }
      return retobj;
    });
  }

  // static autoDetect(): Promise<{ device: string, id: string}> {
  //   return new Promise(async (res, rej) => {
  //     disposeStackmats(1);

  //     let devices = await StackmatInput.updateInputDevices();
  //     let tmo: NodeJS.Timeout;

  //     let cb: StackmatCallback = (st) => {
  //       if ( st.on ) {
  //         clearTimeout(tmo);
  //         disposeStackmats(2);
  //         res({
  //           device: st.device,
  //           id: st.stackmatId
  //         });
  //       }
  //     };

  //     stackmats.push(...devices.map((device: string[]) => {
  //       let sm = new StackmatInput(null as any);
  //       sm.setCallback( cb );
  //       sm.init(device[0], true);
  //       return sm;
  //     }));

  //     tmo = setTimeout(() => {
  //       disposeStackmats(3);
  //       rej();
  //     }, 20000);
  //   });
  // }

  private static stackmatProcessor = "";

  // getDevice(): string {
  //   return this.device;
  // }

  async init(context: InputContext, deviceId?: string, force?: boolean) {
    this.interpreter = createActor(StackmatMachine, {
      input: {
        ...context,
        ...context.timerController,
        stState: writable({}),
        lastState: writable(null),
      },
    });
    this.interpreter.start();

    const selectObj: any = {
      echoCancellation: false,
      noiseSuppression: false,
    };

    if (deviceId) {
      selectObj.deviceId = { exact: deviceId };
    }

    if (this.audio_stream == undefined) {
      return navigator.mediaDevices.getUserMedia({ audio: selectObj }).then(stream => {
        if (this.audio_context?.state == "suspended" && !force) {
          return Promise.reject();
        }
        this.success(stream);
      });
    } else {
      return Promise.resolve();
    }
  }

  setCallback(cb: StackmatCallback) {
    this.callback = cb;
  }

  private async getAudioProcessor() {
    return fetch("/assets/audio-processor.js")
      .then(res => {
        if (!res.ok) throw new Error("");
        return res.text();
      })
      .then(text =>
        URL.createObjectURL(
          new Blob([text], {
            type: "text/javascript",
          })
        )
      );
  }

  async success(stream: MediaStream) {
    if (!this.audio_context) return;

    this.audio_stream = stream;
    this.source = this.audio_context.createMediaStreamSource(stream);

    if (!StackmatInput.stackmatProcessor) {
      StackmatInput.stackmatProcessor = await this.getAudioProcessor();
    }

    const stackmatProcessor = StackmatInput.stackmatProcessor;

    await this.audio_context.audioWorklet.addModule(stackmatProcessor);

    this.node = new AudioWorkletNode(this.audio_context, "stackmat-processor", {
      parameterData: {
        sampleRate: this.audio_context.sampleRate,
        curTimer: 0,
      },
    });

    // let cnv: HTMLCanvasElement = document.getElementById('stackmat-signal') as HTMLCanvasElement;
    // let ctx: CanvasRenderingContext2D | null = null;
    // let buff: number[] = [];
    // const cnvW = 800;
    // const cnvH = 400;
    // const cnvH2 = cnvH / 2;
    // const BUFFSIZE = 50000;

    // if ( !cnv ) {
    //   cnv = document.createElement('canvas');
    //   ctx = cnv.getContext('2d');

    //   document.body.appendChild(cnv);

    //   cnv.width = cnvW;
    //   cnv.height = cnvH;
    //   cnv.style.backgroundColor = 'white';
    //   cnv.style.position = 'absolute';
    //   cnv.style.top = '0';
    //   cnv.style.left = '0';
    //   cnv.setAttribute('id', 'stackmat-signal');
    // } else {
    //   ctx = cnv.getContext('2d');
    // }

    // this.node.port.onmessage = (ev) => {
    //   let { data } = ev;

    //   buff = [...buff, ...(data[0][0].map((e: number) => e * 1000))].slice(-BUFFSIZE);

    //   ctx?.clearRect(0, 0, cnvW, cnvH);
    //   ctx?.beginPath();
    //   ctx?.moveTo(0, cnvH2);
    //   ctx && (ctx.strokeStyle = '1px solid black');

    //   for (let i = 0, maxi = buff.length; i < maxi; i += 1) {
    //     ctx?.lineTo( map(i, 0, BUFFSIZE, 0, cnvW), cnvH2 - buff[i] );
    //   }

    //   ctx?.stroke();
    // };

    this.node.port.onmessage = ev => {
      const { data }: { data: StackmatState } = ev;
      this.callback(data);
      this.isConnected = data.on;
    };

    this.source.connect(this.node);
    this.node.connect(this.audio_context.destination);
  }

  async disconnect() {
    this.interpreter?.stop();
    this.isConnected = false;
    this.lastState = null;

    if (this.audio_stream != undefined) {
      try {
        this.audio_stream.getTracks().forEach(t => t.stop());
        this.audio_stream = undefined;
        this.source?.disconnect(this.node as AudioWorkletNode);
        if (this.audio_context) {
          this.node?.disconnect(this.audio_context.destination);
        }
        this.node?.port.close();
        this.source?.disconnect();
        this.node?.disconnect();
        await this.audio_context?.close();
      } catch (err) {
        console.log("AUDIO_PROCESSOR_ERROR: ", err);
      }
    }
  }

  callback(sst: StackmatState) {
    if (!this.isConnected || !this.enabled) return;

    const ctx = this.interpreter?.getSnapshot().context;
    ctx.time.set(sst.time_milli);
    ctx.stState.set(sst);
    ctx.lastState.set(this.lastState);

    this.interpreter?.send({ type: "state", state: sst, lastState: this.lastState });
    this.lastState = sst;
  }

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
