import { TimerState, type InputContext, type Solve, type StackmatCallback, type StackmatSignalHeader, type StackmatState, type TimerInputHandler } from "@interfaces"; 
import type { Unsubscriber } from "svelte/store";
import stackmatProcessor from './audio-processor.ts?url';

export class StackmatInput implements TimerInputHandler {
  private context: InputContext;
  private device: string;
  private audio_context: AudioContext;
  private audio_stream: MediaStream | undefined;
  private source: MediaStreamAudioSourceNode | null = null;
  // private node: ScriptProcessorNode | null = null;
  private node: AudioWorkletNode | null = null;
  private lastState: StackmatState | null;

  // UI handlers
  private _state: TimerState;
  private _lastSolve: Solve | null;
  private _time: number = 0;
  private subs: Unsubscriber[];

  constructor(context: InputContext) {
    this.context = context;
    this.device = '';
    this.audio_context = new AudioContext();
    this.lastState = null;
    this._state = TimerState.CLEAN;
    this._lastSolve = null;
    this.subs = [];
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

  static autoDetect(): Promise<string> {
    return new Promise(async (res, rej) => {
      let devices = await StackmatInput.updateInputDevices();
      let resolved = false;
      let cb: StackmatCallback = (st) => {
        if ( st.on ) {
          stackmats.forEach(s => s.disconnect());
          resolved = true;
          res(st.device);
        }
      };

      let stackmats = devices.map((device: string[]) => {
        let sm = new StackmatInput(null as any);
        sm.setCallback( cb );
        sm.init('', device[0], true);
        return sm;
      });

      setTimeout(() => {
        stackmats.forEach(s => s.disconnect());
        if ( !resolved ) rej();
      }, 20000);
    });
  }

  init(timer: string, deviceId: string, force: boolean) {
    if ( this.context ) {
      const { state, lastSolve, time } = this.context;
  
      this.subs.push( state.subscribe((st) => this._state = st) );
      this.subs.push( lastSolve.subscribe((sv) => this._lastSolve = sv) );
      this.subs.push( time.subscribe((t) => this._time = t) );
    }
  
    let selectObj: any = {
      "echoCancellation": false,
      "noiseSuppression": false
    };
  
    if ( deviceId ) {
      this.device = deviceId;
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

  async success(stream: MediaStream) {
    this.audio_stream = stream;
    this.source = this.audio_context.createMediaStreamSource( stream );

    await this.audio_context.audioWorklet.addModule( stackmatProcessor );
    this.node = new AudioWorkletNode(this.audio_context, 'stackmat-processor', {
      parameterData: {
        sampleRate: this.audio_context.sampleRate,
        curTimer: 0
      }
    });
    
    this.node.port.onmessage = (ev) => {
      this.callback(ev.data);
    };

    this.source.connect(this.node);
    this.node.connect( this.audio_context.destination );
    // this.source.connect( this.node );
    // this.node.connect( this.audio_context.destination );
  }
 
  disconnect() {
    this.subs.forEach(s => s());

    if ( this.audio_stream != undefined ) {
      try {
        this.source?.disconnect( this.node as AudioWorkletNode );
        this.node?.disconnect( this.audio_context.destination );
        this.audio_context.close();
        this.audio_stream = undefined;
      } catch(e) {}
    }
  }

  callback(sst: StackmatState) {
    const {
      state, time, ready, stackmatStatus,
      createNewSolve, addSolve, initScrambler
    } = this.context;

    stackmatStatus.update(() => sst.on);

    if ( this.lastState && this.lastState.time_milli > sst.time_milli ) {
      state.update(() => TimerState.CLEAN);
    }

    if ( sst.on === false ) {
      if ( this._state != TimerState.CLEAN ) {
        state.update(() => TimerState.CLEAN);
        time.update(() => 0);
        initScrambler();
      }
      this.lastState = sst;
      return;
    }

    if ( sst.running ) {
      if ( this._state != TimerState.RUNNING && !this.lastState?.running ) { 
        createNewSolve();
        state.update(() => TimerState.RUNNING);
      }
    } else {
      if ( this._state === TimerState.RUNNING ) {
        state.update(() => TimerState.STOPPED);
        addSolve();
        ready.update(() => false);
        (this._lastSolve as Solve).time = this._time;
        // !battle &&
        initScrambler();
      }
    }

    time.update(() => sst.time_milli);
    this.lastState = sst;

  }

  keyUpHandler() {}
  keyDownHandler() {}
  stopTimer() {} 
}