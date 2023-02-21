import type { StackmatState } from "@interfaces";

let audio_context: AudioContext;
let audio_stream: MediaStream | undefined;
let source: MediaStreamAudioSourceNode;
let node: ScriptProcessorNode;
let sample_rate: number;
let bitAnalyzer: any;
let curTimer: string;

function updateInputDevices(): Promise<string[][]> {
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

function init(timer: string, deviceId: string, force: boolean) {
  curTimer = timer;

  audio_context = new AudioContext();

  if (curTimer == 'm') {
    sample_rate = audio_context["sampleRate"] / 8000;
    bitAnalyzer = appendBitMoyu;
  } else {
    sample_rate = audio_context["sampleRate"] / 1200;
    bitAnalyzer = appendBit;
  }
  agc_factor = 0.001 / sample_rate;
  lastVal.length = Math.ceil(sample_rate / 6);
  bitBuffer.length = 0;
  byteBuffer.length = 0;

  let selectObj: any = {
    "echoCancellation": false,
    "noiseSuppression": false
  };

  if (deviceId) {
    selectObj["deviceId"] = {
      "exact": deviceId
    };
  }

  if (audio_stream == undefined) {
    return navigator.mediaDevices.getUserMedia({
      "audio": selectObj
    }).then(function(stream) {
      if (audio_context.state == 'suspended' && !force) {
        return Promise.reject();
      }
      success(stream);
    }, console.log);
  } else {
    return Promise.resolve();
  }
}

function stop() {
  if (audio_stream != undefined) {
    try {
      source.disconnect( node );
      node.disconnect( audio_context.destination );
      audio_stream = undefined;
    } catch(e) {}
  }
}

let last_power = 1;
let agc_factor = 0.0001;

function success(stream: MediaStream) {
  audio_stream = stream;
  source = audio_context.createMediaStreamSource(stream);
  node = audio_context.createScriptProcessor(1024, 1, 1);

  node.onaudioprocess = function(e) {
    let input = e.inputBuffer.getChannelData(0);

    //AGC
    for (let i = 0; i < input.length; i++) {
      let power = input[i] * input[i];
      last_power = Math.max(0.0001, last_power + (power - last_power) * agc_factor);
      let gain = 1 / Math.sqrt(last_power);
      procSignal(input[i] * gain);
    }
    return;
  };
  source["connect"](node);
  node["connect"](audio_context["destination"]);
}

//========== Audio2Bits Part ==========
let lastVal: number[] = [];
let lastSgn = 0;
let THRESHOLD_SCHM = 0.2;
let THRESHOLD_EDGE = 0.7;
let lenVoltageKeep = 0;
let distortionStat = 0;

function procSignal(signal: number) {
  // signal = Math.max(Math.min(signal, 1), -1);
  // Schmidt trigger

  lastVal.unshift(signal);

  // @ts-ignore
  let isEdge = (lastVal.pop() - signal) * (lastSgn ? 1 : -1) > THRESHOLD_EDGE &&
    Math.abs(signal - (lastSgn ? 1 : -1)) - 1 > THRESHOLD_SCHM &&
    lenVoltageKeep > sample_rate * 0.6;

  if (isEdge) {
    for (let i = 0; i < Math.round(lenVoltageKeep / sample_rate); i++) {
      bitAnalyzer(lastSgn);
    }
    lastSgn ^= 1;
    lenVoltageKeep = 0;
  } else if (lenVoltageKeep > sample_rate * 2) {
    bitAnalyzer(lastSgn);
    lenVoltageKeep -= sample_rate;
  }
  lenVoltageKeep++;

  //note: signal power has already been normalized. So distortionStat will tends to zero ideally.
  if (last_bit_length < 10) {
    distortionStat = Math.max(0.0001, distortionStat + (Math.pow(signal - (lastSgn ? 1 : -1), 2) - distortionStat) * agc_factor);
  } else if (last_bit_length > 100) {
    distortionStat = 1;
  }
}


//========== Bits Analyzer ==========
let bitBuffer: number[] = [];
let byteBuffer: string[] = [];
let idle_val = 0;
let last_bit = 0;
let last_bit_length = 0;
let no_state_length = 0;

function appendBit(bit: number) {

  bitBuffer.push(bit);
  
  if (bit != last_bit) {
    last_bit = bit;
    last_bit_length = 1;
  } else {
    last_bit_length++;
  }

  no_state_length++;
   
  if (last_bit_length > 10) {
    idle_val = bit;
    
    bitBuffer.length = 0;

    if (byteBuffer.length != 0) {
      byteBuffer.length = 0;
    }

    if (last_bit_length > 100 && stackmat_state.on) {
      stackmat_state.on = false;
      stackmat_state.noise = Math.min(1, distortionStat) || 0;
      stackmat_state.power = last_power;
      callback(stackmat_state);
    } else if (no_state_length > 700) {
      no_state_length = 100;
      stackmat_state.noise = Math.min(1, distortionStat) || 0;
      stackmat_state.power = last_power;
      callback(stackmat_state);
    }
  } else if (bitBuffer.length == 10) {
    if (bitBuffer[0] == idle_val || bitBuffer[9] != idle_val) {
      bitBuffer = bitBuffer.slice(1);
    } else {
      let val = 0;
      for (let i = 8; i > 0; i--) {
        val = val << 1 | (bitBuffer[i] == idle_val ? 1 : 0);
      }
      byteBuffer.push(String.fromCharCode(val));
      decode(byteBuffer);
      bitBuffer.length = 0;
    }
  }
}

function decode(byteBuffer: string[]) {
  
  if (byteBuffer.length != 9 && byteBuffer.length != 10) {
    return;
  }
  
  let re_head = /[ SILRCA]/;
  let re_number = /[0-9]/;
  let head = byteBuffer[0];
  if (!re_head.exec(head)) {
    return;
  }
  let checksum = 64;
  for (let i = 1; i < byteBuffer.length - 3; i++) {
    if (!re_number.exec(byteBuffer[i])) {
      return;
    }
    checksum += ~~(byteBuffer[i]);
  }
  if (checksum != byteBuffer[byteBuffer.length - 3].charCodeAt(0)) {
    return;
  }
  let time_milli = ~~byteBuffer[1] * 60000 +
    ~~(byteBuffer[2] + byteBuffer[3]) * 1000 +
    ~~(byteBuffer[4] + byteBuffer[5] + (byteBuffer.length == 10 ? byteBuffer[6] : '0'));
  pushNewState(head, time_milli, byteBuffer.length == 9 ? 10 : 1);
}

let last_suc_time = 0;

function pushNewState(head: string, time_milli: number, unit: number) {
  let suc_time = Date.now();

  // if (suc_time - last_suc_time > 200) {
  //   console.log('[stackmat] signal miss ', suc_time - last_suc_time);
  // }

  last_suc_time = suc_time;
  let new_state: any = {}
  new_state.time_milli = time_milli;
  new_state.unit = unit;
  new_state.on = true;

  let is_time_inc = unit == stackmat_state.unit ?
    new_state.time_milli > stackmat_state.time_milli :
    Math.floor(new_state.time_milli / 10) > Math.floor(stackmat_state.time_milli / 10);
  new_state.greenLight = head == 'A';
  new_state.leftHand = head == 'L' || head == 'A' || head == 'C';
  new_state.rightHand = head == 'R' || head == 'A' || head == 'C';
  new_state.running = (head != 'S' || stackmat_state.signalHeader == 'S') &&
    (head == ' ' || is_time_inc);
  new_state.signalHeader = head;
  new_state.unknownRunning = !stackmat_state.on;
  new_state.noise = Math.min(1, distortionStat) || 0;
  new_state.power = last_power;

  stackmat_state = new_state;
  no_state_length = 0;
  callback(stackmat_state);
}

function appendBitMoyu(bit: number) {
  if (last_bit != idle_val && last_bit_length == 1) {
    bitBuffer.push(bit);
    if (bitBuffer.length == 24) {
      let time_milli = 0;
      for (let i = 5; i >= 0; i--) {
        time_milli *= 10;
        for (let j = 0; j < 4; j++) {
          time_milli += bitBuffer[i * 4 + j] << j;
        }
      }
      bitBuffer.length = 0;
      pushNewState('S', time_milli, 1);
    }
  }
  if (bit != last_bit) {
    last_bit = bit;
    last_bit_length = 1;
  } else {
    last_bit_length++;
  }
  if (last_bit_length > 10) { //IDLE
    idle_val = bit;
    bitBuffer.length = 0;
    byteBuffer.length = 0;
    if (last_bit_length > 1000 && stackmat_state.on) {
      stackmat_state.on = false;
      stackmat_state.noise = Math.min(1, distortionStat) || 0;
      stackmat_state.power = last_power;
      callback(stackmat_state);
    } else if (last_bit_length > 4000) {
      last_bit_length = 1000;
      stackmat_state.noise = Math.min(1, distortionStat) || 0;
      stackmat_state.power = last_power;
      callback(stackmat_state);
    }
  }
}

let stackmat_state: StackmatState = {
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

let callback: Function = () => {}; // NOOP

export const stackmat = {
  init: init,
  stop: stop,
  updateInputDevices: updateInputDevices,
  setCallBack: function(func: Function) {
    callback = func;
  }
}