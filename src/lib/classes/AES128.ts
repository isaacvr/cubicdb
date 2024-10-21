let Sbox = [
  99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118, 202, 130, 201, 125,
  250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192, 183, 253, 147, 38, 54, 63, 247, 204, 52,
  165, 229, 241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178,
  117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132, 83, 209, 0, 237, 32,
  252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170, 251, 67, 77, 51, 133, 69, 249, 2,
  127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210,
  205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115, 96, 129, 79, 220, 34, 42,
  144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98,
  145, 149, 228, 121, 231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8,
  186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72,
  3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30,
  135, 233, 206, 85, 40, 223, 140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187,
  22,
];
let SboxI: number[] = [];
let ShiftTabI = [0, 13, 10, 7, 4, 1, 14, 11, 8, 5, 2, 15, 12, 9, 6, 3];
let xtime: number[] = [];

declare type State = number[];

export class AES128 {
  key: number[];
  iv: any;

  constructor(key: number[]) {
    this.init();

    let exKey = key.slice();
    let Rcon = 1;

    for (let i = 16; i < 176; i += 4) {
      let tmp = exKey.slice(i - 4, i);

      if (i % 16 == 0) {
        tmp = [Sbox[tmp[1]] ^ Rcon, Sbox[tmp[2]], Sbox[tmp[3]], Sbox[tmp[0]]];
        Rcon = xtime[Rcon];
      }

      for (let j = 0; j < 4; j++) {
        exKey[i + j] = exKey[i + j - 16] ^ tmp[j];
      }
    }
    this.key = exKey;
  }

  private init() {
    if (xtime.length) {
      return;
    }

    for (let i = 0; i < 256; i += 1) {
      SboxI[Sbox[i]] = i;
    }

    for (let i = 0; i < 128; i += 1) {
      xtime[i] = i << 1;
      xtime[128 + i] = (i << 1) ^ 0x1b;
    }
  }

  encrypt(block: State) {
    this.shiftSubAddI(block, this.key.slice(0, 16));

    for (let i = 16; i < 160; i += 16) {
      this.mixColumns(block);
      this.shiftSubAddI(block, this.key.slice(i, i + 16));
    }

    this.addRoundKey(block, this.key.slice(160, 176));

    return block;
  }

  decrypt(block: State) {
    this.addRoundKey(block, this.key.slice(160, 176));

    for (let i = 144; i >= 16; i -= 16) {
      this.shiftSubAdd(block, this.key.slice(i, i + 16));
      this.mixColumnsInv(block);
    }

    this.shiftSubAdd(block, this.key.slice(0, 16));

    return block;
  }

  mixColumns(state: State) {
    for (let i = 12; i >= 0; i -= 4) {
      let s0 = state[i + 0];
      let s1 = state[i + 1];
      let s2 = state[i + 2];
      let s3 = state[i + 3];
      let h = s0 ^ s1 ^ s2 ^ s3;
      state[i + 0] ^= h ^ xtime[s0 ^ s1];
      state[i + 1] ^= h ^ xtime[s1 ^ s2];
      state[i + 2] ^= h ^ xtime[s2 ^ s3];
      state[i + 3] ^= h ^ xtime[s3 ^ s0];
    }
  }

  shiftSubAddI(state: State, rkey: number[]) {
    let state0 = state.slice();

    for (let i = 0; i < 16; i++) {
      state[ShiftTabI[i]] = Sbox[state0[i] ^ rkey[i]];
    }
  }

  addRoundKey(state: State, rkey: number[]) {
    for (let i = 0; i < 16; i++) {
      state[i] ^= rkey[i];
    }
  }

  shiftSubAdd(state: State, rkey: number[]) {
    let state0 = state.slice();

    for (let i = 0; i < 16; i++) {
      state[i] = SboxI[state0[ShiftTabI[i]]] ^ rkey[i];
    }
  }

  mixColumnsInv(state: State) {
    for (let i = 0; i < 16; i += 4) {
      let s0 = state[i + 0];
      let s1 = state[i + 1];
      let s2 = state[i + 2];
      let s3 = state[i + 3];
      let h = s0 ^ s1 ^ s2 ^ s3;
      let xh = xtime[h];
      let h1 = xtime[xtime[xh ^ s0 ^ s2]] ^ h;
      let h2 = xtime[xtime[xh ^ s1 ^ s3]] ^ h;
      state[i + 0] ^= h1 ^ xtime[s0 ^ s1];
      state[i + 1] ^= h2 ^ xtime[s1 ^ s2];
      state[i + 2] ^= h1 ^ xtime[s2 ^ s3];
      state[i + 3] ^= h2 ^ xtime[s3 ^ s0];
    }
  }
}
