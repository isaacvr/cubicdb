import { AES128 } from "@classes/AES128";
import { CubieCube, SOLVED_FACELET, valuedArray } from "@cstimer/lib/mathlib";
import type { InputContext, TimerInputHandler } from "@interfaces";
import { DataService } from "@stores/data.service";
import { decompressFromBase64 } from 'async-lz-string';

function matchUUID(uuid1: string, uuid2: string) {
  return uuid1.toUpperCase() == uuid2.toUpperCase();
}

export class GANInput implements TimerInputHandler {
  private decoder: AES128 | null;
  private device: BluetoothDevice | null;
  private service_meta: BluetoothRemoteGATTService | null;
  private service_data: BluetoothRemoteGATTService | null;
  private service_v2data: BluetoothRemoteGATTService | null;
  private chrct_v2read: BluetoothRemoteGATTCharacteristic | null;
  private chrct_v2write: BluetoothRemoteGATTCharacteristic | null;
  private deviceMac: string;
  private prevMoves: string[];
  private timeOffs: number[];
  private prevCubie: CubieCube;
  private curCubie: CubieCube;
  private latestFacelet: string;
  private deviceTime: number;
  private moveCnt: number;
  private prevMoveCnt: number;
  private keyCheck: number;
  private deviceTimeOffset: number;
  private movesFromLastCheck: number;

  private dataService: DataService;

  battery: number;
  connected: boolean;

  constructor(context: InputContext) {
    this.decoder = null;
    this.service_meta = null;
    this.service_data = null;
    this.service_v2data = null;
    this.chrct_v2read = null;
    this.chrct_v2write = null;

    this.device = null;
    this.deviceMac = '';
    this.prevMoves = [];
    this.timeOffs = [];
    this.prevCubie = new CubieCube();
    this.curCubie = new CubieCube();
    this.latestFacelet = SOLVED_FACELET;
    this.deviceTime = 0;
    this.moveCnt = 0;
    this.prevMoveCnt = -1;
    this.battery = 100;
    this.keyCheck = 0;
    this.deviceTimeOffset = 0;
    this.movesFromLastCheck = 1000;
    this.connected = false;

    this.dataService = DataService.getInstance();
  }

  static get UUID_SUFFIX() {
    return '-0000-1000-8000-00805f9b34fb';
  }

  static get SERVICE_UUID_META() {
    // return '00001801' + GANInput.UUID_SUFFIX;
    return '0000180a' + GANInput.UUID_SUFFIX;
  }

  static get CHRCT_UUID_VERSION() {
    // return '00002a00' + GANInput.UUID_SUFFIX;
    return '00002a28' + GANInput.UUID_SUFFIX;
  }
  
  static get CHRCT_UUID_HARDWARE() {
    // return '00002a01' + GANInput.UUID_SUFFIX;
    return '00002a23' + GANInput.UUID_SUFFIX;
  }
  
  static get SERVICE_UUID_DATA() {
    return '0000fff0' + GANInput.UUID_SUFFIX;
  }
  
  static get SERVICE_UUID_V2DATA() {
    return '6e400001-b5a3-f393-e0a9-e50e24dc4179';
  }
  
  static get CHRCT_UUID_V2READ() {
    return '28be4cb6-cd67-11e9-a32f-2a2ae2dbcce4';
  }
  
  static get CHRCT_UUID_V2WRITE() {
    return '28be4a4a-cd67-11e9-a32f-2a2ae2dbcce4';
  }
  
  static get GAN_CIC_LIST() {
    return [0x0001, 0x0501];
  }
  
  static get CHRCT_UUID_F2() {
    return '0000fff2' + GANInput.UUID_SUFFIX; // cube state, (54 - 6) facelets, 3 bit per facelet
  }
  
  static get CHRCT_UUID_F3() {
    return '0000fff3' + GANInput.UUID_SUFFIX; // prev moves
  }
  
  static get CHRCT_UUID_F5() {
    return '0000fff5' + GANInput.UUID_SUFFIX; // gyro state, move counter, pre moves
  }
  
  static get CHRCT_UUID_F6() {
    return '0000fff6' + GANInput.UUID_SUFFIX; // move counter, time offsets between premoves
  }
  
  static get CHRCT_UUID_F7() {
    return '0000fff7' + GANInput.UUID_SUFFIX;
  }

  static get opServices() {
    return [ GANInput.SERVICE_UUID_DATA, GANInput.SERVICE_UUID_META ];
  }

  private static get KEYS() {
    return [
			"NoRgnAHANATADDWJYwMxQOxiiEcfYgSK6Hpr4TYCs0IG1OEAbDszALpA",
			"NoNg7ANATFIQnARmogLBRUCs0oAYN8U5J45EQBmFADg0oJAOSlUQF0g",
			"NoRgNATGBs1gLABgQTjCeBWSUDsYBmKbCeMADjNnXxHIoIF0g",
			"NoRg7ANAzBCsAMEAsioxBEIAc0Cc0ATJkgSIYhXIjhMQGxgC6QA",
			"NoVgNAjAHGBMYDYCcdJgCwTFBkYVgAY9JpJYUsYBmAXSA",
			"NoRgNAbAHGAsAMkwgMyzClH0LFcArHnAJzIqIBMGWEAukA"
		];
  }

  init() {}
  
  disconnect() {
    if ( !this.connected ) return;
    this.device?.gatt?.disconnect();
    // this.disconnected();
  }

  private clear() {
    this.service_data = null;
    this.service_meta = null;
    this.service_v2data = null;

    let result: Promise<any> = Promise.resolve();
    
    if ( this.chrct_v2read ) {
      this.chrct_v2read.removeEventListener('characteristicvaluechanged', this.onStateChangedV2);
      result = this.chrct_v2read.stopNotifications().catch(() => {});
      this.chrct_v2read = null;
    }

    this.deviceMac = '';
    this.prevMoves = [];
    this.timeOffs = [];
    this.prevCubie = new CubieCube();
    this.curCubie = new CubieCube();
    this.latestFacelet = SOLVED_FACELET;
    this.deviceTime = 0;
    this.prevMoveCnt = -1;
    this.battery = 100;
    return result;
  }

  private async v2initDecoder(mac: string, ver: any) {
    let value: number[] = [];
    
    for (let i = 0; i < 6; i++) {
      value.push(parseInt(mac.slice(i * 3, i * 3 + 2), 16));
    }
    
    let keyiv = await this.getKeyV2(value, ver);
    
    console.log('[gancube] ver=', ver, ' key=', JSON.stringify(keyiv));
    
    this.decoder = new AES128( keyiv[0] );
    this.decoder.iv = keyiv[1];
  }

  private encode(ret: any[]) {
    if ( this.decoder == null ) {
      return ret;
    }

    let iv = this.decoder.iv || [];
    
    for (let i = 0; i < 16; i++) {
      ret[i] ^= ~~iv[i];
    }

    this.decoder.encrypt(ret);

    if (ret.length > 16) {
      let offset = ret.length - 16;
      let block = ret.slice(offset);
      
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
    if ( !this.chrct_v2write ) {
      console.log('[gancube] v2sendRequest cannot find v2write chrct');
      return;
    }

    let encodedReq = this.encode(req.slice());
    
    console.log('[gancube] v2sendRequest', req, encodedReq);
    return this.chrct_v2write.writeValue(new Uint8Array(encodedReq).buffer);
  }

  private v2sendSimpleRequest(opcode: number) {
    let req = valuedArray(20, 0);
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
    let value = event.target.value;

    if ( this.decoder == null ) {
      return;
    }
    this.parseV2Data(value);
  }

  private initCubeState() {
    // let locTime = $.now();
    console.log('[gancube]', 'init cube state');
    // callback(latestFacelet, prevMoves, [null, locTime], deviceName);
    // console.log("Prev facelet: ", this.latestFacelet );
    this.prevCubie.fromFacelet( this.latestFacelet );
    this.prevMoveCnt = this.moveCnt;
  }

  private updateMoveTimes(locTime: number, isV2: boolean) {
    let moveDiff = (this.moveCnt - this.prevMoveCnt) & 0xff;
    
    moveDiff > 1 && console.log('[gancube]', 'bluetooth event was lost, moveDiff = ' + moveDiff);
    
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
      console.log('[gancube]', 'time adjust', locTime - calcTs, '@', locTime);
      this.deviceTime += locTime - calcTs;
    }
    
    for (let i = moveDiff - 1; i >= 0; i--) {
      let m = "URFDLB".indexOf(this.prevMoves[i][0]) * 3 + " 2'".indexOf( this.prevMoves[i][1] );
      CubieCube.EdgeMult(this.prevCubie, CubieCube.moveCube[m], this.curCubie);
      CubieCube.CornMult(this.prevCubie, CubieCube.moveCube[m], this.curCubie);
      this.deviceTime += this.timeOffs[i];
      // callback(curCubie.toFaceCube(), prevMoves.slice(i), [deviceTime, i == 0 ? locTime : null], deviceName + (isV2 ? '*' : ''));
      let tmp = this.curCubie;
      this.curCubie = this.prevCubie;
      this.prevCubie = tmp;
      
      console.log('[gancube] move', this.prevMoves[i], this.timeOffs[i]);
      
      this.emit('move', [ this.prevMoves[i], this.timeOffs[i] ]);
    }

    this.deviceTimeOffset = locTime - this.deviceTime;
  }

  private parseV2Data(value: any) {
    let locTime = Date.now();

    value = this.decode(value);
    
    for (let i = 0; i < value.length; i++) {
      value[i] = (value[i] + 256).toString(2).slice(1);
    }
    
    value = value.join('');
    
    let mode = parseInt(value.slice(0, 4), 2);
    
    if (mode == 1) { // gyro
    } else if (mode == 2) { // cube move
      this.moveCnt = parseInt(value.slice(4, 12), 2);
      
      if ( this.moveCnt == this.prevMoveCnt ) {
        return;
      } else if ( this.prevMoveCnt == -1) {
        this.prevMoveCnt = this.moveCnt;
        return;
      }
      
      this.timeOffs = [];
      this.prevMoves = [];
      
      let keyChkInc = 0;
      
      for (let i = 0; i < 7; i++) {
        let m = parseInt(value.slice(12 + i * 5, 17 + i * 5), 2);
        this.timeOffs[i] = parseInt(value.slice(47 + i * 16, 63 + i * 16), 2);
        this.prevMoves[i] = "URFDLB".charAt(m >> 1) + " '".charAt(m & 1);
        
        if (m >= 12) { // invalid data
          this.prevMoves[i] = "U ";
          keyChkInc = 1;
        }
      }
      
      this.keyCheck += keyChkInc;
      
      if ( keyChkInc == 0 ) {
        this.updateMoveTimes(locTime, true);
      }
    } else if (mode == 4) { // cube state
      console.log('[gancube]', 'v2 received facelets event');
      
      this.moveCnt = parseInt(value.slice(4, 12), 2);
      
      if ( this.moveCnt != this.prevMoveCnt && this.prevMoveCnt != -1) {
        return;
      }

      let cc = new CubieCube();
      let echk = 0;
      let cchk = 0xf00;
      
      for (let i = 0; i < 7; i++) {
        let perm = parseInt(value.slice(12 + i * 3, 15 + i * 3), 2);
        let ori = parseInt(value.slice(33 + i * 2, 35 + i * 2), 2);
        cchk -= ori << 3;
        cchk ^= perm;
        cc.ca[i] = ori << 3 | perm;
      }
      
      cc.ca[7] = (cchk & 0xff8) % 24 | cchk & 0x7;
      
      for (let i = 0; i < 11; i++) {
        let perm = parseInt(value.slice(47 + i * 4, 51 + i * 4), 2);
        let ori = parseInt(value.slice(91 + i, 92 + i), 2);
        echk ^= perm << 1 | ori;
        cc.ea[i] = perm << 1 | ori;
      }
      
      cc.ea[11] = echk;
      
      if ( cc.verify() != 0 ) {
        this.keyCheck++;
        return;
      }

      this.latestFacelet = cc.toFaceCube();

      this.emit('facelet', this.latestFacelet);

      if ( this.prevMoveCnt == -1 ) {
        this.initCubeState();
      } else if ( this.prevCubie.toFaceCube() != this.latestFacelet ) {
        console.log('[gancube]', 'Cube state check error');
        console.log('[gancube]', 'calc', this.prevCubie.toFaceCube());
        console.log('[gancube]', 'read', this.latestFacelet);
        this.prevCubie.fromFacelet( this.latestFacelet );
        // callback(latestFacelet, prevMoves, [null, locTime], deviceName + '*');
      }
      this. prevMoveCnt = this.moveCnt;
    } else if (mode == 5) { // hardware info
      // console.log('[gancube]', 'v2 received hardware info event', value);
      console.log('[gancube]', 'v2 received hardware info event');
      let hardwareVersion = parseInt(value.slice(8, 16), 2) + "." + parseInt(value.slice(16, 24), 2);
      let softwareVersion = parseInt(value.slice(24, 32), 2) + "." + parseInt(value.slice(32, 40), 2);
      let deviceName = '';
      
      for (let i = 0; i < 8; i++) {
        deviceName += String.fromCharCode(parseInt(value.slice(40 + i * 8, 48 + i * 8), 2));
      }

      let gyro = 1 === parseInt(value.slice(104, 105), 2);

      console.log('[gancube]', 'Hardware Version', hardwareVersion);
      console.log('[gancube]', 'Software Version', softwareVersion);
      console.log('[gancube]', 'Device Name', deviceName);
      console.log('[gancube]', 'Gyro Enabled', gyro);

      this.emit('hardware', { hardwareVersion, softwareVersion, deviceName, gyro });
    } else if (mode == 9) { // battery
      this.battery = parseInt(value.slice(8, 16), 2);
      this.emit('battery', this.battery);
      console.log('[gancube]', 'v2 received battery event', this.battery);
    } else {
      console.log('[gancube]', 'v2 received unknown event', value);
    }
  }

  private v2init(ver: any): Promise<boolean> {
    console.log('[gancube] v2init start');
    this.keyCheck = 0;

    this.v2initDecoder(this.deviceMac, ver);

    if ( !this.service_v2data ) {
      return Promise.reject();
    };

    return this.service_v2data.getCharacteristics().then((chrcts) => {
      console.log('[gancube] v2init find chrcts', chrcts);
      
      for (let i = 0; i < chrcts.length; i++) {
        let chrct = chrcts[i]
        console.log('[gancube] v2init find chrct', chrct.uuid);
        if (matchUUID(chrct.uuid, GANInput.CHRCT_UUID_V2READ)) {
          this.chrct_v2read = chrct;
        } else if (matchUUID(chrct.uuid, GANInput.CHRCT_UUID_V2WRITE)) {
          this.chrct_v2write = chrct;
        }
      }
      if ( !this.chrct_v2read ) {
        console.log('[gancube] v2init cannot find v2read chrct');
      }
    }).then(() => {
      console.log('[gancube] v2init v2read start notifications');
      return this.chrct_v2read?.startNotifications();
    }).then(() => {
      console.log('[gancube] v2init v2read notification started');
      return this.chrct_v2read?.addEventListener('characteristicvaluechanged', (e: any) => {
        this.onStateChangedV2(e);
      });
    }).then(() => {
      return this.v2requestHardwareInfo();
    }).then(() => {
      return this.v2requestFacelets();
    }).then(() => {
      return this.v2requestBattery();
    }).then(() => true);
  }

  private emit(type: string, data: any) {
    this.dataService.bluetoothSub.set({ type, data });
  }

  private disconnected() {
    this.connected = false;
    this.emit('disconnect', null);
  }

  async fromDevice(device: BluetoothDevice): Promise<string> {
    this.clear();

    this.device = device;
    this.deviceMac = localStorage.getItem('bluetooth-mac') || '';

    console.log('[gancube] deviceMac: ', this.deviceMac);

    let server: BluetoothRemoteGATTServer | undefined;
    
    try {
      server = await device.gatt?.connect();
    } catch(err) {
      console.log('Connect err: ', err);
      device.gatt?.disconnect();
      return '';
    }

    let services: BluetoothRemoteGATTService[] | undefined = await server?.getPrimaryServices();

    if ( !services ) {
      device.gatt?.disconnect();
      return '';
    }

    for (let i = 0, maxi = services?.length || 0; i < maxi; i++) {
      let service = services[i];
      if ( matchUUID(service.uuid, GANInput.SERVICE_UUID_META) ) {
        this.service_meta = service;
      } else if ( matchUUID(service.uuid, GANInput.SERVICE_UUID_DATA) ) {
        this.service_data = service;
      } else if ( matchUUID(service.uuid, GANInput.SERVICE_UUID_V2DATA) ) {
        this.service_v2data = service;
      }
    }

    if ( this.service_v2data ) {
      let res = await this.v2init((device.name || '').startsWith('AiCube') ? 1 : 0);

      if ( res ) {
        this.connected = true;
        this.emit('connect', null);

        device.addEventListener('gattserverdisconnected', () => {
          this.disconnected();
        });

        return this.deviceMac;
      }

      device.gatt?.disconnect();

      return '';
    }

    if ( this.service_data && this.service_meta ) {
      // return this.v1init();
    }

    return '';
  }

  checkHardware(server: any, characteristic: string): Promise<any> {
    let _service_meta: any;

    return server.getPrimaryService( GANInput.SERVICE_UUID_META ).then(( service_meta: any ) => {
      console.log("SERVICE_META: ", service_meta);
      _service_meta = service_meta;
      return service_meta.getCharacteristic( characteristic );
    }).then((chrct: any) => {
      return chrct.readValue();
    }).then((value: any) => {
      console.log("CHARACTERISTIC_VALUE: ", value);
      let version = value.getUint8(0) << 16 | value.getUint8(1) << 8 | value.getUint8(2);
      
      this.decoder = null;
      
      if (version > 0x010007 && (version & 0xfffe00) == 0x010000) {

        console.log('READING UUID: ', GANInput.CHRCT_UUID_HARDWARE);

        return _service_meta.getCharacteristic(GANInput.CHRCT_UUID_HARDWARE).then((chrct: any) => {
          return chrct.readValue();
        }).then(async (value: any) => {
          console.log("UUID_VALUE", value);
          let key = await this.getKey(version, value);
          if (!key) {
            // logohint.push('Not support your Gan cube');
            console.log('Not support your Gan cube 1: ', characteristic);
            return;
          }
          // console.log('[gancube] key', JSON.stringify(key));
          this.decoder = new AES128(key);
        });
      } else { //not support
        // logohint.push('Not support your Gan cube');
        console.log('Not support your Gan cube 2: ', characteristic);
      }
    });
  }

  private decode(value: DataView) {
    let ret = [];
    
    for (let i = 0; i < value.byteLength; i++) {
      ret[i] = value.getUint8(i);
    }
    
    if ( this.decoder == null ) {
      return ret;
    }
    let iv = this.decoder.iv || [];
    if (ret.length > 16) {
      let offset = ret.length - 16;
      let block = this.decoder.decrypt(ret.slice(offset));
      for (let i = 0; i < 16; i++) {
        ret[i + offset] = block[i] ^ (~~iv[i]);
      }
    }
    
    this.decoder.decrypt(ret);
    
    for (let i = 0; i < 16; i++) {
      ret[i] ^= (~~iv[i]);
    }
    return ret;
  }

  private async getKey(version: number, value: DataView) {
    let key = GANInput.KEYS[ version >> 8 & 0xff ];
    
    if (!key) {
      return;
    }

    // key = JSON.parse(LZString.decompressFromEncodedURIComponent(key));
    let k: number[] = JSON.parse( await decompressFromBase64(key) );
    
    for (let i = 0; i < 6; i++) {
      k[i] = (k[i] + value.getUint8(5 - i)) & 0xff;
    }
    
    return k;
  }

  private async getKeyV2(value: number[], ver: any): Promise<number[][]> {
    let v = ver || 0;
    let key = JSON.parse( await decompressFromBase64( GANInput.KEYS[2 + v * 2] ) );
    let iv = JSON.parse( await decompressFromBase64( GANInput.KEYS[3 + v * 2] ));
    for (let i = 0; i < 6; i++) {
      key[i] = (key[i] + value[5 - i]) % 255;
      iv[i] = (iv[i] + value[5 - i]) % 255;
    }
    return [key, iv];
  }

  keyUpHandler() {}
  keyDownHandler() {}
  stopTimer() {}
}