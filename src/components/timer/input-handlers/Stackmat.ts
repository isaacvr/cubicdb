import { TimerState, type InputContext, type StackmatCallback, type StackmatState, type TimerInputHandler } from '@interfaces';
import { get } from 'svelte/store';
import { createMachine, interpret, send } from 'xstate';

const enterDisconnect = ({ state, stackmatStatus }: InputContext) => {
  stackmatStatus.set(false);
  state.set( TimerState.CLEAN );
}

const enterClean = ({ state }: InputContext) => {
  state.set( TimerState.CLEAN );
}

const enterInspection = ({ state }: InputContext) => {
  state.set( TimerState.INSPECTION );
}

const enterRunning = ({ state }: InputContext) => {
  state.set( TimerState.RUNNING );
}

const enterStopped = ({ state, addSolve, time }: InputContext) => {
  state.set( TimerState.STOPPED );
  addSolve( get(time) );
}

const isTurnedOn = ({ stackmatStatus }: InputContext, { state }: { state: StackmatState }) => {
  if ( !get(stackmatStatus) && state.on ) {
    stackmatStatus.set(true);
    return true;
  }

  return false;
}

const isTurnedOff = ({ stackmatStatus }: InputContext, { state }: { state: StackmatState }) => {
  if ( get(stackmatStatus) && !state.on ) {
    stackmatStatus.set(false);
    return true;
  }

  return false;
}

const wasRunning = ({ time, stackmatStatus, createNewSolve }: InputContext, { state }: { state: StackmatState }) => {
  if ( get(stackmatStatus) && state.time_milli > get(time) ) {
    createNewSolve();
    return true;
  }

  return false;
}

const isRunning = ({ time, state, createNewSolve }: InputContext, st: { state: StackmatState }) => {
  if ( st.state.time_milli > get(time) ) {
    createNewSolve();
    state.set( TimerState.RUNNING );
    return true;
  }
  
  return false;
};

const wasCleaned = ({ time, initScrambler }: InputContext, { state }: { state: StackmatState }) => {
  if (state.time_milli < get(time)) {
    initScrambler();
    return true;
  }

  return false;
};

const wasStopped = ({ state }: InputContext, st: { state: StackmatState }) => {
  return get(state) === TimerState.RUNNING && !st.state.running;
};

const StackmatMachine = createMachine<InputContext, any>({
  predictableActionArguments: true,
  initial: 'DISCONNECTED',
  states: {
    DISCONNECTED: {
      entry: enterDisconnect,
      on: {
        state: [
          { target: 'CLEAN', cond: isTurnedOn },
          { target: 'RUNNING', cond: wasRunning },
        ]
      }
    },
    
    CLEAN: {
      entry: enterClean,
      on: {
        state: [
          { target: 'RUNNING', cond: isRunning },
          { target: 'CLEAN', cond: wasCleaned },
        ]
      }
    },
    
    INSPECTION: {
      entry: enterInspection,
    },
    
    RUNNING: {
      entry: enterRunning,
      on: {
        state: [
          { target: 'CLEAN', cond: wasCleaned },
          { target: 'STOPPED', cond: wasStopped }
        ],
      }
    },
    
    STOPPED: {
      entry: enterStopped,
      on: {
        state: [
          { target: 'CLEAN', cond: wasCleaned }
        ]
      }
    },
  },

  on: {
    state: { target: 'DISCONNECTED', cond: isTurnedOff }
  }
});

export class StackmatInput implements TimerInputHandler {
  private audio_context: AudioContext;
  private audio_stream: MediaStream | undefined;
  private source: MediaStreamAudioSourceNode | null = null;
  private node: AudioWorkletNode | null = null;
  private interpreter;
  private isActive: boolean;

  id: string;

  constructor(context: InputContext) {
    this.interpreter = interpret( StackmatMachine.withContext(context) );
    this.audio_context = new AudioContext();
    this.id = crypto.randomUUID();
    this.isActive = false;
    // this.interpreter.onTransition((st) => console.log('STATE: ', st.value));
  }

  static updateInputDevices(): Promise<string[][]> {
    let devices: string[][] = [];
    let retobj: Promise<string[][]> = new Promise(function(resolve, reject) {
      resolve(devices);
    });
  
    return navigator.mediaDevices.enumerateDevices().then(function(deviceInfos) {
      for (let i = 0; i < deviceInfos.length; i++) {
        let deviceInfo = deviceInfos[i];
        if (deviceInfo.kind === 'audioinput') {
          devices.push([deviceInfo.deviceId, deviceInfo.label || 'microphone ' + (devices.length + 1)]);
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

  private static stackmatProcessor = '';

  // getDevice(): string {
  //   return this.device;
  // }

  init(deviceId: string, force: boolean) {
    console.log("INIT STACKMAT: ", deviceId, force);

    this.interpreter.start();
    this.isActive = true;
  
    let selectObj: any = {
      "echoCancellation": false,
      "noiseSuppression": false
    };
  
    if ( deviceId ) {
      selectObj.deviceId = { "exact": deviceId };
    }
  
    if ( this.audio_stream == undefined ) {
      return navigator.mediaDevices.getUserMedia({ "audio": selectObj })
        .then((stream) => {
          if ( this.audio_context.state == 'suspended' && !force ) {
            return Promise.reject();
          }
          this.success(stream);
        }, console.log);
    } else {
      return Promise.resolve();
    }
  }

  setCallback(cb: StackmatCallback) {
    this.callback = cb;
  }

  private async getAudioProcessor() {
    return fetch('/assets/audio-processor.js')
      .then((res) => {
        if ( !res.ok ) throw new Error('');
        return res.text();
      })
      .then(text => URL.createObjectURL(new Blob([ text ], {
        type: 'text/javascript'
      })));
  }

  async success(stream: MediaStream) {
    this.audio_stream = stream;
    this.source = this.audio_context.createMediaStreamSource( stream );

    if ( !StackmatInput.stackmatProcessor ) {
      StackmatInput.stackmatProcessor = await this.getAudioProcessor();
    }

    let stackmatProcessor = StackmatInput.stackmatProcessor;
    
    await this.audio_context.audioWorklet.addModule( stackmatProcessor );

    this.node = new AudioWorkletNode(this.audio_context, 'stackmat-processor', {
      parameterData: {
        sampleRate: this.audio_context.sampleRate,
        curTimer: 0
      }
    });
    
    this.node.port.onmessage = (ev) => {
      let { data }: { data: StackmatState} = ev;
      data.stackmatId = this.id;
      this.callback(data);
    };

    this.source.connect(this.node);
    this.node.connect( this.audio_context.destination );
  }
 
  async disconnect() {
    this.interpreter.stop();
    this.isActive = false;

    if ( this.audio_stream != undefined ) {
      try {
        await this.audio_context.close();
        this.audio_stream = undefined;
        this.source?.disconnect( this.node as AudioWorkletNode );
        this.node?.disconnect( this.audio_context.destination );
      } catch(err) {
        console.log("AUDIO_PROCESSOR_ERROR: ", err);
      }
    }
  }

  callback(sst: StackmatState) {
    if ( !this.isActive ) return;

    this.interpreter.send({ type: 'state', state: sst });
    this.interpreter.machine.context.time.set( sst.time_milli );
  }

  keyUpHandler() {}
  keyDownHandler() {}
  stopTimer() {} 
}