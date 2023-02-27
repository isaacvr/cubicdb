import { TimerState, type InputContext, type Solve, type StackmatCallback, type StackmatSignalHeader, type StackmatState, type TimerInputHandler } from "@interfaces"; 
import type { Unsubscriber } from "svelte/store";

export class StackmatInput implements TimerInputHandler {
  private context: InputContext;
  private audio_context: AudioContext;
  private audio_stream: MediaStream | undefined;
  private source: MediaStreamAudioSourceNode | null = null;
  private node: ScriptProcessorNode | null = null;
  private sample_rate: number = 0;
  private bitAnalyzer: any;
  private curTimer: string = '';
  private last_power = 1;
  private agc_factor = 0.0001;
  private lastState: StackmatState | null;
  public state: StackmatState = {
    time_milli: 0,
    unit: 10,
    on: false,
    greenLight: false,
    leftHand: false,
    rightHand: false,
    running: false,
    unknownRunning: true,
    signalHeader: 'I',
    noise: 1,
    power: 1
  };

  // UI handlers
  private _state: TimerState;
  private _lastSolve: Solve | null;
  private _time: number = 0;
  private subs: Unsubscriber[];
  
  //========== Audio2Bits Part ==========
  private lastVal: number[] = [];
  private lastSgn = 0;
  private readonly THRESHOLD_SCHM = 0.2;
  private readonly THRESHOLD_EDGE = 0.7;
  private lenVoltageKeep = 0;
  private distortionStat = 0;

  //========== Bits Analyzer ==========
  private bitBuffer: number[] = [];
  private byteBuffer: string[] = [];
  private idle_val = 0;
  private last_bit = 0;
  private last_bit_length = 0;
  private no_state_length = 0;

  constructor(context: InputContext) {
    this.context = context;
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

  init(timer: string, deviceId: string, force: boolean) {
    const { state, lastSolve, time } = this.context;

    this.subs.push( state.subscribe((st) => this._state = st) );
    this.subs.push( lastSolve.subscribe((sv) => this._lastSolve = sv) );
    this.subs.push( time.subscribe((t) => this._time = t) );

    this.curTimer = timer;
  
    if ( this.curTimer == 'm' ) {
      this.sample_rate = this.audio_context.sampleRate / 8000;
      this.bitAnalyzer = this.appendBitMoyu;
    } else {
      this.sample_rate = this.audio_context.sampleRate / 1200;
      this.bitAnalyzer = this.appendBit;
    }

    this.agc_factor = 0.001 / this.sample_rate;
    
    this.lastVal.length = Math.ceil(this.sample_rate / 6);
    this.bitBuffer.length = 0;
    this.byteBuffer.length = 0;
  
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

  success(stream: MediaStream) {
    this.audio_stream = stream;
    this.source = this.audio_context.createMediaStreamSource(stream);
    this.node = this.audio_context.createScriptProcessor(1024, 1, 1);
  
    this.node.onaudioprocess = (e) => {
      let input = e.inputBuffer.getChannelData(0);
  
      //AGC
      for (let i = 0; i < input.length; i++) {
        let power = input[i] * input[i];
        this.last_power = Math.max(0.0001, this.last_power + (power - this.last_power) * this.agc_factor);
        let gain = 1 / Math.sqrt( this.last_power );
        this.procSignal(input[i] * gain);
      }
      return;
    };
    this.source.connect( this.node );
    this.node.connect( this.audio_context.destination );
  }

  procSignal(signal: number) {
    this.lastVal.unshift(signal);
  
    let isEdge = ((this.lastVal.pop() || 0) - signal) * (this.lastSgn ? 1 : -1) > this.THRESHOLD_EDGE &&
      Math.abs(signal - (this.lastSgn ? 1 : -1)) - 1 > this.THRESHOLD_SCHM &&
      this.lenVoltageKeep > this.sample_rate * 0.6;
  
    if ( isEdge ) {
      for (let i = 0, maxi = Math.round(this.lenVoltageKeep / this.sample_rate); i < maxi; i += 1) {
        this.bitAnalyzer( this.lastSgn );
      }

      this.lastSgn ^= 1;
      this.lenVoltageKeep = 0;
    } else if ( this.lenVoltageKeep > this.sample_rate * 2 ) {
      this.bitAnalyzer( this.lastSgn );
      this.lenVoltageKeep -= this.sample_rate;
    }

    this.lenVoltageKeep++;
  
    if ( this.last_bit_length < 10 ) {
      this.distortionStat = Math.max(
        0.0001,
        this.distortionStat + (Math.pow(signal - (this.lastSgn ? 1 : -1), 2) - this.distortionStat) * this.agc_factor
      );
    } else if ( this.last_bit_length > 100 ) {
      this.distortionStat = 1;
    }
  }

  appendBit(bit: number) {
    this.bitBuffer.push(bit);
    
    if (bit != this.last_bit) {
      this.last_bit = bit;
      this.last_bit_length = 1;
    } else {
      this.last_bit_length += 1;
    }
  
    this.no_state_length++;
     
    if ( this.last_bit_length > 10 ) {
      this.idle_val = bit;
      
      this.bitBuffer.length = 0;
  
      if ( this.byteBuffer.length != 0 ) {
        this.byteBuffer.length = 0;
      }
  
      if ( this.last_bit_length > 100 && this.state.on ) {
        this.state.on = false;
        this.state.noise = Math.min(1, this.distortionStat) || 0;
        this.state.power = this.last_power;
        this.callback( this.state );
      } else if ( this.no_state_length > 700 ) {
        this.no_state_length = 100;
        this.state.noise = Math.min(1, this.distortionStat) || 0;
        this.state.power = this.last_power;
        this.callback( this.state );
      }
    } else if ( this.bitBuffer.length == 10 ) {
      if ( this.bitBuffer[0] == this.idle_val || this.bitBuffer[9] != this.idle_val) {
        this.bitBuffer = this.bitBuffer.slice(1);
      } else {
        let val = 0;
        for (let i = 8; i > 0; i--) {
          val = val << 1 | (this.bitBuffer[i] == this.idle_val ? 1 : 0);
        }
        this.byteBuffer.push( String.fromCharCode(val) );
        this.decode( this.byteBuffer );
        this.bitBuffer.length = 0;
      }
    }
  }

  decode(byteBuffer: string[]) {
  
    if ( byteBuffer.length != 9 && byteBuffer.length != 10 ) {
      return;
    }
    
    let re_head = /[ SILRCA]/;
    let re_number = /[0-9]/;
    let head: StackmatSignalHeader = byteBuffer[0] as StackmatSignalHeader;

    if ( !re_head.exec(head) ) {
      return;
    }

    let checksum = 64;
    
    for (let i = 1; i < byteBuffer.length - 3; i++) {
      if ( !re_number.exec(byteBuffer[i]) ) {
        return;
      }

      checksum += ~~(byteBuffer[i]);
    }

    if ( checksum != byteBuffer[byteBuffer.length - 3].charCodeAt(0) ) {
      return;
    }

    let time_milli = ~~byteBuffer[1] * 60000 +
      ~~(byteBuffer[2] + byteBuffer[3]) * 1000 +
      ~~(byteBuffer[4] + byteBuffer[5] + (byteBuffer.length == 10 ? byteBuffer[6] : '0'));
    
    this.pushNewState(head, time_milli, byteBuffer.length == 9 ? 10 : 1);

  }

  pushNewState(head: StackmatSignalHeader, time_milli: number, unit: number) {
    let is_time_inc = unit == this.state.unit ?
      time_milli > this.state.time_milli :
      Math.floor(time_milli / 10) > Math.floor(this.state.time_milli / 10);

    let new_state: StackmatState = {
      time_milli,
      unit,
      on: true,
      greenLight: head === 'A',
      leftHand: head == 'L' || head == 'A' || head == 'C',
      rightHand: head == 'R' || head == 'A' || head == 'C',
      running: (head != 'S' || this.state.signalHeader == 'S') &&
      (head == ' ' || is_time_inc),
      signalHeader: head,
      unknownRunning: !this.state.on,
      noise: Math.min(1, this.distortionStat) || 0,
      power: this.last_power,
    };

    this.state = new_state;
    this.no_state_length = 0;
    this.callback( this.state );
  }
  
  appendBitMoyu(bit: number) {
    if ( this.last_bit != this.idle_val && this.last_bit_length == 1 ) {
      this.bitBuffer.push( bit );
      
      if ( this.bitBuffer.length == 24 ) {
        let time_milli = 0;
        
        for (let i = 5; i >= 0; i--) {
          time_milli *= 10;
          
          for (let j = 0; j < 4; j++) {
            time_milli += this.bitBuffer[i * 4 + j] << j;
          }
        }

        this.bitBuffer.length = 0;
        this.pushNewState('S', time_milli, 1);
      }
    }

    if ( bit != this.last_bit ) {
      this.last_bit = bit;
      this.last_bit_length = 1;
    } else {
      this.last_bit_length++;
    }

    if ( this.last_bit_length > 10 ) { //IDLE
      this.idle_val = bit;
      this.bitBuffer.length = 0;
      this.byteBuffer.length = 0;

      if ( this.last_bit_length > 1000 && this.state.on ) {
        this.state.on = false;
        this.state.noise = Math.min(1, this.distortionStat) || 0;
        this.state.power = this.last_power;
        this.callback( this.state );
      } else if ( this.last_bit_length > 4000 ) {
        this.last_bit_length = 1000;
        this.state.noise = Math.min(1, this.distortionStat) || 0;
        this.state.power = this.last_power;
        this.callback( this.state );
      }
    }
  }

  disconnect() {
    this.subs.forEach(s => s());

    if ( this.audio_stream != undefined ) {
      try {
        this.source?.disconnect( this.node as ScriptProcessorNode );
        this.node?.disconnect( this.audio_context.destination );
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
        return;
      }
    }

    if ( sst.running ) {
      if ( this._state != TimerState.RUNNING ) { 
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
  // }

  // function connectStackmat() {
  //   stackmat.stop();
  //   stackmat.init('', deviceID, true);
  // }

  // function updateDevices() {
  //   stackmat.updateInputDevices().then(dev => {
  //     deviceList = dev;
  //   })
  // }

  // stackmat.setCallBack( stackmatCallback );

  // navigator.mediaDevices.addEventListener('devicechange', () => {
  //   updateDevices();
  // });

  // updateDevices();
  ///
  }

  keyUpHandler() {}
  keyDownHandler() {}
  stopTimer() {} 
}