import { TimerState, type InputContext, type Solve, type StackmatCallback, type StackmatState, type TimerInputHandler } from "@interfaces"; 
import type { Unsubscriber } from "svelte/store";

type StackmatInternalState = 'OFF' | 'ON' | 'RUNNING' | 'STOPPED' | 'CLEAN';

export class StackmatInput implements TimerInputHandler {
  private context: InputContext;
  private device: string;
  private audio_context: AudioContext;
  private audio_stream: MediaStream | undefined;
  private source: MediaStreamAudioSourceNode | null = null;
  private node: AudioWorkletNode | null = null;
  private lastState: StackmatState | null;
  private state: StackmatInternalState;

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
    this.state = 'OFF';
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

  // static autoDetect(): Promise<string> {
  //   return new Promise(async (res, rej) => {
  //     let devices = await StackmatInput.updateInputDevices();
  //     let resolved = false;
  //     let cb: StackmatCallback = (st) => {
  //       if ( st.on ) {
  //         stackmats.forEach(s => s.disconnect());
  //         resolved = true;
  //         res(st.device);
  //       }
  //     };

  //     let stackmats = devices.map((device: string[]) => {
  //       let sm = new StackmatInput(null as any);
  //       sm.setCallback( cb );
  //       sm.init(device[0], true);
  //       return sm;
  //     });

  //     setTimeout(() => {
  //       stackmats.forEach(s => s.disconnect());
  //       if ( !resolved ) rej();
  //     }, 20000);
  //   });
  // }

  init(deviceId: string, force: boolean) {
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

    let stackmatProcessor = await this.getAudioProcessor();
    
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
  }
 
  disconnect() {
    this.subs.forEach(s => s());
    this.state = 'OFF';
    this.lastState = null;

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
    const { time } = this.context;

    time.update(() => sst.time_milli);

    this.state === 'OFF' && this.OFF(sst);
    this.state === 'ON' && this.ON(sst);
    this.state === 'RUNNING' && this.RUNNING(sst);
    this.state === 'STOPPED' && this.STOPPED();

    this.lastState = sst;

  }

  keyUpHandler() {}
  keyDownHandler() {}
  stopTimer() {} 

  // STATE MACHINE
  private OFF(st: StackmatState) {
    const { state, createNewSolve } = this.context;
    
    // Default detection
    if ( st.on && !this.lastState?.on ) {
      this.context.stackmatStatus.update(() => true);
      return this.state = 'ON';
    }

    // Running
    if ( st.time_milli > (this.lastState?.time_milli || 0) ) {
      createNewSolve();
      state.update(() => TimerState.RUNNING);
      return this.state = 'RUNNING';
    }
  }

  private ON(st: StackmatState) {
    const {
      stackmatStatus, state, createNewSolve
    } = this.context;

    // Turned off
    if ( this.lastState?.on && !st.on ) {
      stackmatStatus.update(() => false);
      return this.state = 'OFF';
    }

    // Running
    if ( st.time_milli > (this.lastState?.time_milli || 0) ) {
      createNewSolve();
      state.update(() => TimerState.RUNNING);
      return this.state = 'RUNNING';
    }

    // Cleaned
    if ( st.time_milli < (this.lastState?.time_milli || 0) ) {
      this.CLEAN();
      return;
    }
  }

  private RUNNING(st: StackmatState) {
    const {
      stackmatStatus, state
    } = this.context; 

    // Turned off
    if ( this.lastState?.on && !st.on ) {
      stackmatStatus.update(() => false);
      this.clean();
      return this.state = 'OFF';
    }

    // Stopped
    if ( this.lastState?.running && !st.running ) {
      if ( st.time_milli ) {
        state.update(() => TimerState.STOPPED);
        this.STOPPED();
        return this.state = 'ON';
      } else {
        state.update(() => TimerState.CLEAN);
        this.clean();
        return this.state = 'ON';
      }
    }

    // Timer port was unplugged
    if ( st.time_milli <= (this.lastState?.time_milli || 0) ) {
      stackmatStatus.update(() => false);
      this.clean();
      return this.state = 'OFF';
    }
  }
  
  private STOPPED() {
    const { addSolve, initScrambler } = this.context;

    addSolve();
    initScrambler();
  }
  
  private clean() {
    const { state, time, initScrambler } = this.context;

    state.update(() => TimerState.CLEAN);
    time.update(() => 0);
    initScrambler();
  }

  private CLEAN() {
    this.clean();
    this.context.initScrambler();
    this.state = 'ON';
  }
}