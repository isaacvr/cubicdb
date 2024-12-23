import type { Actor } from "@helpers/stateMachine";
import { randomUUID } from "@helpers/strings";
import {
  TimerState,
  type InputContext,
  type StackmatCallback,
  type StackmatState,
  type TimerInputHandler,
} from "@interfaces";
import { get, writable, type Writable } from "svelte/store";
import { createActor, setup } from "xstate";

interface StackmatContext extends InputContext {
  stState: Writable<StackmatState>;
  lastState: Writable<StackmatState | null>;
}

type STActor = (data: Actor<StackmatContext>) => any;

const enterDisconnect: STActor = ({ context: { state, stackmatStatus } }) => {
  stackmatStatus.set(false);
  state.set(TimerState.CLEAN);
};

const enterClean: STActor = ({ context: { state } }) => {
  state.set(TimerState.CLEAN);
};

const enterInspection: STActor = ({ context: { state } }) => {
  state.set(TimerState.INSPECTION);
};

const enterRunning: STActor = ({ context: { state } }) => {
  state.set(TimerState.RUNNING);
};

const enterStopped: STActor = ({ context: { state, time, addSolve } }) => {
  state.set(TimerState.STOPPED);
  addSolve(get(time));
};

const isTurnedOn: STActor = ({ context: { stackmatStatus, lastState, stState } }) => {
  if (!get(lastState)?.on && get(stState).on) {
    stackmatStatus.set(true);
    return true;
  }

  return false;
};

const isTurnedOff: STActor = ({ context: { stackmatStatus, stState } }) => {
  if (get(stackmatStatus) && !get(stState).on) {
    stackmatStatus.set(false);
    return true;
  }

  return false;
};

const isRunning: STActor = ({
  context: { lastState, stackmatStatus, stState, createNewSolve },
}) => {
  if (get(stState).on && get(stState).time_milli > (get(lastState)?.time_milli || 0)) {
    createNewSolve();
    stackmatStatus.set(true);
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

export class StackmatInput implements TimerInputHandler {
  private audio_context: AudioContext;
  private audio_stream: MediaStream | undefined;
  private source: MediaStreamAudioSourceNode | null = null;
  private node: AudioWorkletNode | null = null;
  private interpreter;
  private isActive: boolean;
  private lastState: StackmatState | null;

  id: string;

  constructor(context: InputContext) {
    this.interpreter = createActor(StackmatMachine, {
      input: {
        ...context,
        stState: writable({}),
        lastState: writable(null),
      },
    });
    this.audio_context = new AudioContext();
    this.id = randomUUID();
    this.isActive = false;
    this.lastState = null;
  }

  static async updateInputDevices(): Promise<string[][]> {
    const devices: string[][] = [];
    const retobj: Promise<string[][]> = new Promise(function (resolve, reject) {
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

  init(deviceId: string, force: boolean) {
    this.interpreter.start();
    this.isActive = true;

    const selectObj: any = {
      echoCancellation: false,
      noiseSuppression: false,
    };

    if (deviceId) {
      selectObj.deviceId = { exact: deviceId };
    }

    if (this.audio_stream == undefined) {
      return navigator.mediaDevices.getUserMedia({ audio: selectObj }).then(stream => {
        if (this.audio_context.state == "suspended" && !force) {
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
      data.stackmatId = this.id;
      this.callback(data);
    };

    this.source.connect(this.node);
    this.node.connect(this.audio_context.destination);
  }

  async disconnect() {
    this.interpreter.stop();
    this.isActive = false;
    this.lastState = null;

    if (this.audio_stream != undefined) {
      try {
        this.audio_stream.getTracks().forEach(t => t.stop());
        this.audio_stream = undefined;
        this.source?.disconnect(this.node as AudioWorkletNode);
        this.node?.disconnect(this.audio_context.destination);
        this.node?.port.close();
        this.source?.disconnect();
        this.node?.disconnect();
        await this.audio_context.close();
      } catch (err) {
        console.log("AUDIO_PROCESSOR_ERROR: ", err);
      }
    }
  }

  callback(sst: StackmatState) {
    if (!this.isActive) return;

    const ctx = this.interpreter.getSnapshot().context;
    ctx.time.set(sst.time_milli);
    ctx.stState.set(sst);
    ctx.lastState.set(this.lastState);

    this.interpreter.send({ type: "state", state: sst, lastState: this.lastState });
    this.lastState = sst;
  }

  keyUpHandler() {}
  keyDownHandler() {}
  stopTimer() {}
  newRecord() {}
  sendEvent() {}
}
