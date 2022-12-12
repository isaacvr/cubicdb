import { createMove, createPrun, getNPerm, setNPerm, Cnk, edgeMove, getPruning, rn } from './../lib/mathlib';

let permPrun, flipPrun, ecPrun, fullPrun;
let cmv = [];
let pmul = [];
let fmul = [];

let e1mv = [];
let c1mv = [];

const DEBUG = false;

function pmv(a, c) {
  let b = cmv[c][~~(a / 24)];
  return 24 * ~~(b / 384) + pmul[a % 24][(b >> 4) % 24]
}

function fmv(b, c) {
  let a = cmv[c][b >> 4];
  return ~~(a / 384) << 4 | fmul[b & 15][(a >> 4) % 24] ^ a & 15
}

function i2f(a, c) {
  for (let b = 3; 0 <= b; b--) c[b] = a & 1, a >>= 1
}

function f2i(c) {
  let a;
  let b;
  for (a = 0, b = 0; 4 > b; b++) a <<= 1, a |= c[b];
  return a;
}

function fullmv(idx, move) {
  let slice = cmv[move][~~(idx / 384)];
  let flip = fmul[idx & 15][(slice >> 4) % 24] ^ slice & 15;
  let perm = pmul[(idx >> 4) % 24][(slice >> 4) % 24];
  return (~~(slice / 384)) * 384 + 16 * perm + flip;
}

let initRet = false;

function init() {
  if ( initRet ) {
    return;
  }
  initRet = true;
  for (let i = 0; i < 24; i++) {
    pmul[i] = [];
  }
  for (let i = 0; i < 16; i++) {
    fmul[i] = [];
  }
  let pm1 = [];
  let pm2 = [];
  let pm3 = [];
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 24; j++) {
      setNPerm(pm1, i, 4);
      setNPerm(pm2, j, 4);
      for (let k = 0; k < 4; k++) {
        pm3[k] = pm1[pm2[k]];
      }
      pmul[i][j] = getNPerm(pm3, 4);
      if (i < 16) {
        i2f(i, pm1);
        for (let k = 0; k < 4; k++) {
          pm3[k] = pm1[pm2[k]];
        }
        fmul[i][j] = f2i(pm3);
      }
    }
  }
  createMove(cmv, 495, getmv);

  permPrun = [];
  flipPrun = [];
  createPrun(permPrun, 0, 11880, 5, pmv);
  createPrun(flipPrun, 0, 7920, 6, fmv);

  //combMove[comb][m] = comb*, flip*, perm*
  //newcomb = comb*, newperm = perm x perm*, newflip = flip x perm* ^ flip*
  function getmv(comb, m) {
    let arr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let r = 4;
    for (let i = 0; i < 12; i++) {
      if (comb >= Cnk[11 - i][r]) {
        comb -= Cnk[11 - i][r--];
        arr[i] = r << 1;
      } else {
        arr[i] = -1;
      }
    }
    edgeMove(arr, m);
    comb = 0, r = 4;
    let t = 0;
    let pm = [];
    for (let i = 0; i < 12; i++) {
      if (arr[i] >= 0) {
        comb += Cnk[11 - i][r--];
        pm[r] = arr[i] >> 1;
        t |= (arr[i] & 1) << (3 - r);
      }
    }
    return (comb * 24 + getNPerm(pm, 4)) << 4 | t;
  }
}

let xinitRet = false;

function xinit() {
  if ( xinitRet ) {
    return;
  }
  xinitRet = true;
  init();
  for (let i = 0; i < 24; i++) {
    c1mv[i] = [];
    e1mv[i] = [];
    for (let m = 0; m < 6; m++) {
      c1mv[i][m] = cornMove(i, m);
      let edge = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
      edge[i >> 1] = i & 1;
      edgeMove(edge, m);
      for (let e = 0; e < 12; e++) {
        if (edge[e] >= 0) {
          e1mv[i][m] = e << 1 | edge[e];
          break;
        }
      }
    }
  }
  ecPrun = [];
  for (let obj = 0; obj < 4; obj++) {
    let prun = [];
    createPrun(prun, (obj + 4) * 3 * 24 + (obj + 4) * 2, 576, 5, function(q, m) {
      return c1mv[~~(q / 24)][m] * 24 + e1mv[q % 24][m]
    });
    ecPrun[obj] = prun;
  }

  function cornMove(corn, m) {
    let idx = ~~(corn / 3);
    let twst = corn % 3;
    let idxt = [
      [3, 1, 2, 7, 0, 5, 6, 4],
      [0, 1, 6, 2, 4, 5, 7, 3],
      [1, 2, 3, 0, 4, 5, 6, 7],
      [0, 5, 1, 3, 4, 6, 2, 7],
      [4, 0, 2, 3, 5, 1, 6, 7],
      [0, 1, 2, 3, 7, 4, 5, 6]
    ];
    let twstt = [
      [2, 0, 0, 1, 1, 0, 0, 2],
      [0, 0, 1, 2, 0, 0, 2, 1],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 2, 0, 0, 2, 1, 0],
      [1, 2, 0, 0, 2, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ];
    twst = (twst + twstt[m][idx]) % 3;
    return idxt[m][idx] * 3 + twst;
  }
}

//e4perm, e4flip, e1, c1
//obj: -1:only cross.
//	i-4: end when e==i*2, c==i*3
function idaxcross(q, t, e, c, obj, l, lm, sol) {
  if (l == 0) {
    return q == 0 && t == 0 && e == (obj + 4) * 2 && c == (obj + 4) * 3;
  } else {
    if (getPruning(permPrun, q) > l || getPruning(flipPrun, t) > l || getPruning(ecPrun[obj], c * 24 + e) > l) return false;
    let p, s, ex, cx, a, m;
    for (m = 0; m < 6; m++) {
      if (m != lm && m != lm - 3) {
        p = q;
        s = t;
        ex = e;
        cx = c;
        for (a = 0; a < 3; a++) {
          p = pmv(p, m);
          s = fmv(s, m);
          ex = e1mv[ex][m];
          cx = c1mv[cx][m];
          if (idaxcross(p, s, ex, cx, obj, l - 1, m, sol)) {
            sol.push("FRUBLD".charAt(m) + " 2'".charAt(a));
            DEBUG && console.log("IDAXCROSS SOL: ", sol);
            return (true);
          }
        }
      }
    }
  }
  return false;
}

//e4perm, e4flip
function idacross(q, t, l, lm, sol) {
  if (l == 0) {
    return q == 0 && t == 0;
  } else {
    if (getPruning(permPrun, q) > l || getPruning(flipPrun, t) > l) return false;
    let p, s, a, m;
    for (m = 0; m < 6; m++) {
      if (m != lm && m != lm - 3) {
        p = q;
        s = t;
        for (a = 0; a < 3; a++) {
          p = pmv(p, m);
          s = fmv(s, m);
          if (idacross(p, s, l - 1, m, sol)) {
            sol.push("FRUBLD".charAt(m) + " 2'".charAt(a));
            DEBUG && console.log("IDACROSS SOL: ", sol);
            return (true);
          }
        }
      }
    }
  }
  return false;
}

// let faceStr = ["D", "U", "L", "R", "F", "B"];
let moveIdx = ["FRUBLD", "FLDBRU", "FDRBUL", "FULBDR", "URBDLF", "DRFULB"]
// let rotIdx = ["&nbsp;&nbsp;", "z2", "z'", "z&nbsp;", "x'", "x&nbsp;"];

// let curScramble;

const scrambleReg = /^([\d]+)?([FRUBLDfrubldzxySME])(?:([w])|&sup([\d]);)?([2'])?$/;

function parseScramble(scramble, moveMap) {
  var moveseq = [];
  var moves = scramble.split(' ');
  var m, w, f, p;
  for (var s=0; s<moves.length; s++) {
    m = scrambleReg.exec(moves[s]);
    if (m == null) {
      continue;
    }
    f = "FRUBLDfrubldzxySME".indexOf(m[2]);
    if (f > 14) {
      p = "2'".indexOf(m[5] || 'X') + 2;
      f = [0, 4, 5][f % 3];
      moveseq.push([moveMap.indexOf("FRUBLD".charAt(f)), 2, p]);
      moveseq.push([moveMap.indexOf("FRUBLD".charAt(f)), 1, 4-p]);
      continue;
    }
    w = f < 12 ? (~~m[1] || ~~m[4] || ((m[3] == "w" || f > 5) && 2) || 1) : -1;
    p = (f < 12 ? 1 : -1) * ("2'".indexOf(m[5] || 'X') + 2);
    moveseq.push([moveMap.indexOf("FRUBLD".charAt(f % 6)), w, p]);
  }
  return moveseq;
}

export function solve_cross(moves) {
  init();
  let seq = parseScramble(moves, "FRUBLD");
  let ret = [];
  for (let face = 0; face < 6; face++) {
    let flip = 0;
    let perm = 0;
    for (let i = 0; i < seq.length; i++) {
      let m = moveIdx[face].indexOf("FRUBLD".charAt(seq[i][0]));
      let p = seq[i][2];
      for (let j = 0; j < p; j++) {
        flip = fmv(flip, m);
        perm = pmv(perm, m);
      }
    }
    let sol = [];
    for (let len = 0; len < 100; len++) {
      if (idacross(perm, flip, len, -1, sol)) {
        break;
      }
    }
    sol.reverse();
    ret.push(sol);
  }

  DEBUG && console.log('CROSS RET:', ret);
  return ret;
}

export function solve_xcross(moves: string, face) {
  xinit();
  let flip = 0;
  let perm = 0;
  let e1 = [8, 10, 12, 14];
  let c1 = [12, 15, 18, 21];
  let seq = parseScramble(moves, "FRUBLD");
  for (let i = 0; i < seq.length; i++) {
    let m = moveIdx[face].indexOf("FRUBLD".charAt(seq[i][0]));
    let p = seq[i][2];
    for (let j = 0; j < p; j++) {
      flip = fmv(flip, m);
      perm = pmv(perm, m);
      for (let obj = 0; obj < 4; obj++) {
        e1[obj] = e1mv[e1[obj]][m];
        c1[obj] = c1mv[c1[obj]][m];
      }
    }
  }
  let sol = [];
  let found = false;
  let len = 0;
  while (!found) {
    for (let obj = 0; obj < 4; obj++) {
      if (idaxcross(perm, flip, e1[obj], c1[obj], obj, len, -1, sol)) {
        found = true;
        break;
      }
    }
    len++;
  }
  sol.reverse();

  DEBUG && console.log('XCROSS RET:', sol);
  return sol;
}

let fullInitRet = false;

function fullInit() {
  if ( fullInitRet ) {
    return;
  }
  fullInitRet = true;
  init();
  fullPrun = [];
  createPrun(fullPrun, 0, 190080, 7, fullmv, 6, 3, 6);
}

export function getEasyCross(length) {
  fullInit();
  if (length > 8) {
    length = 8;
  }
  let cases = rn([1, 16, 174, 1568, 11377, 57758, 155012, 189978, 190080][length]) + 1;
  let i;
  for (i = 0; i < 190080; i++) {
    if (getPruning(fullPrun, i) <= length && --cases == 0) {
      break;
    }
  }
  let comb = ~~(i / 384);
  let perm = (i >> 4) % 24;
  let flip = i & 15;

  let arrp = [];
  let arrf = [];
  let pm = [];
  let fl = [];
  i2f(flip, fl);
  setNPerm(pm, perm, 4);
  let r = 4;
  let map = [7, 6, 5, 4, 10, 9, 8, 11, 3, 2, 1, 0];
  for (i = 0; i < 12; i++) {
    if (comb >= Cnk[11 - i][r]) {
      comb -= Cnk[11 - i][r--];
      arrp[map[i]] = pm[r];
      arrf[map[i]] = fl[r];
    } else {
      arrp[map[i]] = arrf[map[i]] = -1;
    }
  }
  return [arrp, arrf];
}