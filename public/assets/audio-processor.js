class AudioProcessor extends AudioWorkletProcessor {
  constructor(params) {
    super();

    this.sample_rate = 41000;
    this.last_power = 1;
    this.bitAnalyzer = null;
    this.state = {
      device: '',
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
    this.multiplier = 1;

    //========== Audio2Bits Part ==========
    this.lastVal = [];
    this.lastSgn = 0;
    this.THRESHOLD_SCHM = 0.2;
    this.THRESHOLD_EDGE = 0.7;
    this.lenVoltageKeep = 0;
    this.distortionStat = 0;

    //========== Bits Analyzer ==========
    this.bitBuffer = [];
    this.byteBuffer = [];
    this.idle_val = 0;
    this.last_bit = 0;
    this.last_bit_length = 0;
    this.no_state_length = 0;

    if ( params?.parameterData?.curTimer ) {
      this.sample_rate = (params.parameterData?.sampleRate || 44100) / 8000;
      this.bitAnalyzer = this.appendBitMoyu;
    } else {
      this.sample_rate = (params?.parameterData?.sampleRate || 44100) / 1200;
      this.bitAnalyzer = this.appendBit;
    }

    this.agc_factor = 0.001 / this.sample_rate;
    this.lastVal.length = Math.ceil(this.sample_rate / 6);
  }

  process(inputs) {
    let input = inputs[0] || [];

    if ( !input || !input[0] ) return true;

    // let sm = [0, 0];
    // let c = [0, 0];

    // for (let i = 0, maxi = input[0].length; i < maxi; i++) {
    //   let signal = input[1][i] - input[0][i];
      
    //   if ( signal > 0 ) {
    //     sm[1] += signal;
    //     c[1] += 1;
    //   } else {
    //     sm[0] += signal;
    //     c[0] += 1;
    //   }
    // }

    // console.log("AVGS: ", sm[0] / c[0], sm[1] / c[1]);

    // const maxs = 0.0005;
    // let f1 = (c[0] === 0 || sm[0] === 0) ? 1 : -maxs / (sm[0] / c[0]);
    // let f2 = (c[1] === 0 || sm[1] === 0) ? 1 : maxs / (sm[1] / c[1]);

    // // mm => [-0.001, 0.001];
    // this.multiplier = this.multiplier + (Math.min(f1, f2) - this.multiplier) * 0.01;
    // console.log("MULT: ", this.multiplier);

    //AGC
    for (let i = 0, maxi = input[0].length; i < maxi; i++) {
      let signal = (input[1][i] - input[0][i]) * this.multiplier;
      let power = signal ** 2;
      this.last_power = Math.max(0.0001, this.last_power + (power - this.last_power) * this.agc_factor);
      let gain = 1 / Math.sqrt( this.last_power );
      this.procSignal(signal * gain);
    }

    return true;
  }

  procSignal(signal) {
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

  appendBit(bit) {
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
        this.port.postMessage( this.state );
      } else if ( this.no_state_length > 700 ) {
        this.no_state_length = 100;
        this.state.noise = Math.min(1, this.distortionStat) || 0;
        this.state.power = this.last_power;
        this.port.postMessage( this.state );
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
 
  appendBitMoyu(bit) {
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
        this.port.postMessage( this.state );
      } else if ( this.last_bit_length > 4000 ) {
        this.last_bit_length = 1000;
        this.state.noise = Math.min(1, this.distortionStat) || 0;
        this.state.power = this.last_power;
        this.port.postMessage( this.state );
      }
    }
  }

  decode(byteBuffer) {
  
    if ( byteBuffer.length != 9 && byteBuffer.length != 10 ) {
      return;
    }
    
    let re_head = /[ SILRCA]/;
    let re_number = /[0-9]/;
    let head = byteBuffer[0];

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

  pushNewState(head, time_milli, unit) {
    let is_time_inc = unit == this.state.unit ?
      time_milli > this.state.time_milli :
      Math.floor(time_milli / 10) > Math.floor(this.state.time_milli / 10);

    let new_state = {
      device: '',
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

    this.port.postMessage( this.state );
  }
}

registerProcessor('stackmat-processor', AudioProcessor);

export {};