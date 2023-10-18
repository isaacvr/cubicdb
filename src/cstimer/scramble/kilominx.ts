"use strict";

import { Cnk, createMove, createPrun, getNPerm, getPruning, minx, rn, rndPerm, setNPerm } from "@cstimer/lib/mathlib";
import { regScrambler } from "./scramble";

let U = 0, R = 5, F = 10, L = 15, BL = 20, BR = 25, DR = 30, DL = 35, DBL = 40, B = 45, DBR = 50, D = 55;
let kiloFacelet = [
	[U + 2, R + 3, F + 4],
	[U + 3, F + 3, L + 4],
	[U + 4, L + 3, BL + 4],
	[U + 0, BL + 3, BR + 4],
	[U + 1, BR + 3, R + 4],
	[D + 3, B + 0, DBL + 1],
	[D + 2, DBR + 0, B + 1],
	[D + 1, DR + 0, DBR + 1],
	[D + 0, DL + 0, DR + 1],
	[D + 4, DBL + 0, DL + 1],
	[F + 0, R + 2, DR + 3],
	[L + 0, F + 2, DL + 3],
	[BL + 0, L + 2, DBL + 3],
	[BR + 0, BL + 2, B + 3],
	[R + 0, BR + 2, DBR + 3],
	[B + 4, BL + 1, DBL + 2],
	[DBR + 4, BR + 1, B + 2],
	[DR + 4, R + 1, DBR + 2],
	[DL + 4, F + 1, DR + 2],
	[DBL + 4, L + 1, DL + 2]
];

export class KiloCubie {
	perm: number[];
	twst: number[];

	constructor() {
		this.perm = [];
		this.twst = [];

		for (let i = 0; i < 20; i++) {
			this.perm[i] = i;
			this.twst[i] = 0;
		}
	}

	static SOLVED = new KiloCubie;
	static moveCube: KiloCubie[] = [];
	static symCube: KiloCubie[] = [];
	static symMult: number[][] = [];
	static symMulI: number[][] = [];
	static symMulM: number[][] = [];
	static CombCoord: any;

	toFaceCube(kFacelet?: number[][]) {
		kFacelet = kFacelet || kiloFacelet;
		let f = [];

		for (let c = 0; c < 20; c++) {
			let j = this.perm[c];
			let ori = this.twst[c];
			for (let n = 0; n < 3; n++) {
				f[kFacelet[c][(n + ori) % 3]] = ~~(kFacelet[j][n] / 5);
			}
		}
		return f;
	}

	fromFacelet(facelet: number[], kFacelet?: number[][]) {
		kFacelet = kFacelet || kiloFacelet;
		let count = 0;
		let f = [];
		for (let i = 0; i < 60; ++i) {
			f[i] = facelet[i];
			count += Math.pow(16, f[i]);
		}
		if (count != 0x555555555555) {
			return -1;
		}
		for (let i = 0; i < 20; i++) {
			for (let j = 0; j < 20; j++) {
				let twst = -1;
				for (let t = 0; t < 3; t++) {
					if (~~(kFacelet[j][0] / 5) == f[kFacelet[i][t]] && 
							~~(kFacelet[j][1] / 5) == f[kFacelet[i][(t + 1) % 3]] && 
							~~(kFacelet[j][2] / 5) == f[kFacelet[i][(t + 2) % 3]]) {
						twst = t;
						break;
					}
				}
				if (twst != -1) {
					this.perm[i] = j;
					this.twst[i] = twst;
				}
			}
		}
		return this;
	}

	hashCode() {
		let ret = 0;
		for (let i = 0; i < 20; i++) {
			ret = 0 | (ret * 31 + this.perm[i] * 3 + this.twst[i]);
		}
		return ret;
	}

	static KiloMult(a: KiloCubie, b: KiloCubie, prod: KiloCubie) {
		for (let i = 0; i < 20; i++) {
			prod.perm[i] = a.perm[b.perm[i]];
			prod.twst[i] = (a.twst[b.perm[i]] + b.twst[i]) % 3;
		}
	}

	static KiloMult3(a: KiloCubie, b: KiloCubie, c: KiloCubie, prod: KiloCubie) {
		for (let i = 0; i < 20; i++) {
			prod.perm[i] = a.perm[b.perm[c.perm[i]]];
			prod.twst[i] = (a.twst[b.perm[c.perm[i]]] + b.twst[c.perm[i]] + c.twst[i]) % 3;
		}
	}

	invFrom(cc: KiloCubie) {
		for (let i = 0; i < 20; i++) {
			this.perm[cc.perm[i]] = i;
			this.twst[cc.perm[i]] = (3 - cc.twst[i]) % 3;
		}
		return this;
	}

	init(perm: number[], twst: number[]) {
		this.perm = perm.slice();
		this.twst = twst.slice();
		return this;
	}

	isEqual(c: KiloCubie) {
		for (let i = 0; i < 20; i++) {
			if (this.perm[i] != c.perm[i] || this.twst[i] != c.twst[i]) {
				return false;
			}
		}
		return true;
	}

	setComb(idx: number, r?: number) {
		r = r || 4;
		let fill = 19;
		for (let i = 19; i >= 0; i--) {
			if (idx >= Cnk[i][r]) {
				idx -= Cnk[i][r--];
				this.perm[i] = r;
			} else {
				this.perm[i] = fill--;
			}
			this.twst[i] = 0;
		}
	}

	getComb(r?: number) {
		r = r || 4;
		let thres = r;
		let idxComb = 0;
		let idxOri = 0;
		let permR = [];
		for (let i = 19; i >= 0; i--) {
			if (this.perm[i] < thres) {
				idxComb += Cnk[i][r--];
				idxOri = idxOri * 3 + this.twst[i];
				permR[r] = this.perm[i];
			}
		}
		return [idxComb, getNPerm(permR, thres), idxOri];
	}

	faceletMove(face: number, pow: number, wide: number) {
		let facelet = this.toFaceCube();
		let state = [];
		for (let i = 0; i < 12; i++) {
			for (let j = 0; j < 5; j++) {
				state[i * 11 + j] = facelet[i * 5 + j];
				state[i * 11 + j + 5] = 0;
			}
			state[i * 11 + 10] = 0;
		}
		minx.doMove(state, face, pow, wide);
		for (let i = 0; i < 12; i++) {
			for (let j = 0; j < 5; j++) {
				facelet[i * 5 + j] = state[i * 11 + j];
			}
		}
		this.fromFacelet(facelet);
	}
}

function createMoveCube() {
	//init move
	let moveCube = [];
	let moveHash = [];
	for (let i = 0; i < 12 * 4; i++) {
		moveCube[i] = new KiloCubie();
	}
	for (let a = 0; a < 48; a += 4) {
		moveCube[a].faceletMove(a >> 2, 1, 0);
		moveHash[a] = moveCube[a].hashCode();
		for (let p = 0; p < 3; p++) {
			KiloCubie.KiloMult(moveCube[a + p], moveCube[a], moveCube[a + p + 1]);
			moveHash[a + p + 1] = moveCube[a + p + 1].hashCode();
		}
	}
	KiloCubie.moveCube = moveCube;

	//init sym
	let symCube: KiloCubie[] = [];
	let symMult: number[][] = [];
	let symMulI: number[][] = [];
	let symMulM: number[][] = [];
	let symHash: number[] = [];
	let tmp = new KiloCubie();

	for (let s = 0; s < 60; s++) {
		symCube[s] = new KiloCubie().init(tmp.perm, tmp.twst);
		symHash[s] = symCube[s].hashCode();
		symMult[s] = [];
		symMulI[s] = [];
		tmp.faceletMove(0, 1, 1); // [U]
		if (s % 5 == 4) { // [F] or [R]
			tmp.faceletMove(s % 10 == 4 ? 1 : 2, 1, 1);
		}
		if (s % 30 == 29) {
			tmp.faceletMove(1, 2, 1);
			tmp.faceletMove(2, 1, 1);
			tmp.faceletMove(0, 3, 1);
		}
	}
	for (let i = 0; i < 60; i++) {
		for (let j = 0; j < 60; j++) {
			KiloCubie.KiloMult(symCube[i], symCube[j], tmp);
			let k = symHash.indexOf(tmp.hashCode());
			symMult[i][j] = k;
			symMulI[k][j] = i;
		}
	}
	for (let s = 0; s < 60; s++) {
		symMulM[s] = [];
		for (let j = 0; j < 12; j++) {
			KiloCubie.KiloMult3(symCube[symMulI[0][s]], moveCube[j * 4], symCube[s], tmp);
			let k = moveHash.indexOf(tmp.hashCode());
			symMulM[s][j] = k >> 2;
		}
	}

	KiloCubie.symCube = symCube;
	KiloCubie.symMult = symMult;
	KiloCubie.symMulI = symMulI;
	KiloCubie.symMulM = symMulM;
}

class CombCoord {
	map: KiloCubie;
	imap: KiloCubie;
	tmp: KiloCubie;

	constructor(cubieMap: number[]) {
		this.map = new KiloCubie();
		this.imap = new KiloCubie();
		this.map.perm = cubieMap.slice();
		for (let i = 0; i < 20; i++) {
			if (cubieMap.indexOf(i) == -1) {
				this.map.perm.push(i);
			}
		}
		this.imap.invFrom(this.map);
		this.tmp = new KiloCubie();
	}

	get(cc: KiloCubie, r?: number) {
		KiloCubie.KiloMult3(this.imap, cc, this.map, this.tmp);
		return this.tmp.getComb(r);
	}

	set(cc: KiloCubie, idx: number, r?: number) {
		this.tmp.setComb(idx, r);
		KiloCubie.KiloMult3(this.map, this.tmp, this.imap, cc);
	}
}

KiloCubie.CombCoord = CombCoord;

let perm4Mult: number[][] = [];
let perm4MulT: number[][] = [];
let perm4TT: number[][] = [];

let perm3Mult = [];
let perm3MulT = [];
let perm3TT = [];

let ckmv: number[] = [];

let urfMove = [1, 2, 0, 5, 10, 6, 3, 4, 9, 11, 7, 8];
let y2Move = [0, 3, 4, 5, 1, 2, 8, 9, 10, 6, 7, 11];
let yMove = [0, 2, 3, 4, 5, 1, 7, 8, 9, 10, 6, 11];

function comb4FullMove(moveTable: number[][][], idx: number, move: number) {
	let slice = ~~(idx / 81 / 24);
	let perm = ~~(idx / 81) % 24;
	let twst = idx % 81;
	let val = moveTable[move][slice];
	slice = val[0];
	perm = perm4Mult[perm][val[1]];
	twst = perm4TT[perm4MulT[val[1]][twst]][val[2]];
	return slice * 81 * 24 + perm * 81 + twst;
}

function comb3FullMove(moveTable: number[][][], idx: number, move: number) {
	let slice = ~~(idx / 27 / 6);
	let perm = ~~(idx / 27) % 6;
	let twst = idx % 27;
	let val = moveTable[move][slice];
	slice = val[0];
	perm = perm4Mult[perm][val[1]];
	twst = perm4TT[perm4MulT[val[1]][twst * 3] / 3][val[2]];
	return slice * 27 * 6 + perm * 27 + twst;
}

let isInit = false;

function init() {
	if ( isInit ) return;
	
	isInit = true;

	let tt = performance.now();
	createMoveCube();

	function setTwst4(arr: number[], idx: number) {
		for (let k = 0; k < 4; k++) {
			arr[k] = idx % 3;
			idx = ~~(idx / 3);
		}
	}

	function getTwst4(arr: number[]) {
		let idx = 0;
		for (let k = 3; k >= 0; k--) {
			idx = idx * 3 + arr[k];
		}
		return idx;
	}

	let perm1: number[] = [];
	let perm2: number[] = [];
	let perm3: number[] = [];

	for (let i = 0; i < 24; i++) {
		perm4Mult[i] = [];
		setNPerm(perm1, i, 4);
		for (let j = 0; j < 24; j++) {
			setNPerm(perm2, j, 4);
			for (let k = 0; k < 4; k++) {
				perm3[k] = perm1[perm2[k]];
			}
			perm4Mult[i][j] = getNPerm(perm3, 4);
		}
	}

	for (let j = 0; j < 24; j++) {
		perm4MulT[j] = [];
		setNPerm(perm2, j, 4);
		for (let i = 0; i < 81; i++) {
			setTwst4(perm1, i);
			for (let k = 0; k < 4; k++) {
				perm3[k] = perm1[perm2[k]];
			}
			perm4MulT[j][i] = getTwst4(perm3);
		}
	}

	for (let j = 0; j < 81; j++) {
		perm4TT[j] = [];
		setTwst4(perm2, j);
		for (let i = 0; i < 81; i++) {
			setTwst4(perm1, i);
			for (let k = 0; k < 4; k++) {
				perm3[k] = (perm1[k] + perm2[k]) % 3;
			}
			perm4TT[j][i] = getTwst4(perm3);
		}
	}

	let tmp1 = new KiloCubie();
	let tmp2 = new KiloCubie();
	
	for (let m1 = 0; m1 < 12; m1++) {
		ckmv[m1] = 1 << m1;
		for (let m2 = 0; m2 < m1; m2++) {
			KiloCubie.KiloMult(KiloCubie.moveCube[m1 * 4], KiloCubie.moveCube[m2 * 4], tmp1);
			KiloCubie.KiloMult(KiloCubie.moveCube[m2 * 4], KiloCubie.moveCube[m1 * 4], tmp2);
			if (tmp1.isEqual(tmp2)) {
				ckmv[m1] |= 1 << m2;
			}
		}
	}

	initPhase1();
	initPhase2();
	initPhase3();
	console.log('[kilo] init finished, tt=', performance.now() - tt);
}

let Phase1Move: any[] = [];
let Phase2Move: any[] = [];
let Phase3Move: any[] = [];
let Phase1Prun: number[] = [];
let Phase2Prun: number[] = [];
let Phase3Prun: number[] = [];
let phase1Coord: CombCoord;
let phase2Coord: CombCoord;
let phase3Coord: CombCoord;

function initPhase1() {
	phase1Coord = new CombCoord([5, 6, 7, 8, 9]);
	let tmp1 = new KiloCubie();
	let tmp2 = new KiloCubie();
	createMove(Phase1Move, 1140, function(idx: number, move: number) {
		phase1Coord.set(tmp1, idx, 3);
		KiloCubie.KiloMult(tmp1, KiloCubie.moveCube[move * 4], tmp2);
		return phase1Coord.get(tmp2, 3);
	}, 12);
	createPrun(Phase1Prun, 0, 1140 * 27 * 6, 8, comb3FullMove.bind(null, Phase1Move), 12, 4, 5);
}

function initPhase2() {
	phase2Coord = new CombCoord([13, 15, 16, 0, 1, 2, 3, 4, 10, 11, 12, 14, 17, 18, 19]);
	let tmp1 = new KiloCubie();
	let tmp2 = new KiloCubie();
	createMove(Phase2Move, 455, function(idx: number, move: number) {
		phase2Coord.set(tmp1, idx, 3);
		KiloCubie.KiloMult(tmp1, KiloCubie.moveCube[move * 4], tmp2);
		return phase2Coord.get(tmp2, 3);
	}, 6);
	createPrun(Phase2Prun, 0, 455 * 27 * 6, 8, comb3FullMove.bind(null, Phase2Move), 6, 4, 4);
}

function initPhase3() {
	phase3Coord = new CombCoord([0, 1, 2, 3, 4, 10, 11, 14, 17, 18]);
	let tmp1 = new KiloCubie();
	let tmp2 = new KiloCubie();
	createMove(Phase3Move, 210, function(idx: number, move: number) {
		phase3Coord.set(tmp1, idx);
		KiloCubie.KiloMult(tmp1, KiloCubie.moveCube[move * 4], tmp2);
		return phase3Coord.get(tmp2);
	}, 3);
	createPrun(Phase3Prun, 0, 210 * 81 * 24, 14, comb4FullMove.bind(null, Phase3Move), 3, 4, 6);
}

function idaSearch(idx: any, isSolved: Function, getPrun: Function, doMove: Function, N_AXIS: number, maxl: number, lm: number, sol: any[]) {
	if (maxl == 0) {
		return isSolved(idx);
	} else if (getPrun(idx) > maxl) {
		return false;
	}
	for (let axis = 0; axis < N_AXIS; axis++) {
		if (ckmv[lm] >> axis & 1) {
			continue;
		}
		let idx1 = idx;
		for (let pow = 0; pow < 4; pow++) {
			idx1 = doMove(idx1, axis);
			if (idx1 == null) {
				break;
			}
			if (idaSearch(idx1, isSolved, getPrun, doMove, N_AXIS, maxl - 1, axis, sol)) {
				sol.push([axis, pow]);
				// sol.push(["U", "R", "F", "L", "BL", "BR", "DR", "DL", "DBL", "B", "DBR", "D"][axis] + ["", "2", "2'", "'"][pow]);
				return true;
			}
		}
	}
	return false;
}

function solve(idx: number[], isSolved: Function, getPrun: Function, doMove: Function, N_AXIS: number, maxl: number) {
	let sol: any[] = [];
	for (let l = 0; l <= maxl; l++) {
		if (idaSearch(idx, isSolved, getPrun, doMove, N_AXIS, l, -1, sol)) {
			break;
		}
	}
	sol.reverse();
	return sol;
}

// function solveMulti(idxs, isSolved, getPrun, doMove, N_AXIS, maxl) {
// 	let sol = [];
// 	let s = 0;
// 	out: for (let l = 0; l <= maxl; l++) {
// 		for (s = 0; s < idxs.length; s++) {
// 			if (idaSearch(idxs[s], isSolved, getPrun, doMove, N_AXIS, l, -1, sol)) {
// 				break out;
// 			}
// 		}
// 	}
// 	sol.reverse();
// 	return [s, sol];
// }

function move2str(moves: number[][]) {
	let ret = [];
	for (let i = 0; i < moves.length; i++) {
		ret.push(["U", "R", "F", "L", "BL", "BR", "DR", "DL", "DBL", "B", "DBR", "D"][moves[i][0]] + ["", "2", "2'", "'"][moves[i][1]]);
	}
	return ret.join(' ');
}

function solveKiloCubie(cc: KiloCubie) {
	init();
	let kc0 = new KiloCubie();
	let kc1 = new KiloCubie();

	kc0.init(cc.perm, cc.twst);

	let idx;

	//phase1
	let doPhase1Move = comb3FullMove.bind(null, Phase1Move);
	let val0 = phase1Coord.get(kc0, 3);
	KiloCubie.KiloMult3(KiloCubie.symCube[KiloCubie.symMulI[0][2]], kc0, KiloCubie.symCube[2], kc1);
	let val1 = phase1Coord.get(kc1, 3);
	idx = [val0[0] * 27 * 6 + val0[1] * 27 + val0[2], val1[0] * 27 * 6 + val1[1] * 27 + val1[2]];
	let tt = +new Date;
	let sol1 = solve(idx, function(idx: number[]) {
		return idx[0] == 0 && idx[1] == 0;
	}, function(idx: number[]) {
		return Math.max(getPruning(Phase1Prun, idx[0]), getPruning(Phase1Prun, idx[1]));
	}, function(idx: number[], move: number) {
		let idx1 = [doPhase1Move(idx[0], move), doPhase1Move(idx[1], y2Move[move])];
		if (idx1[0] == idx[0] && idx1[1] == idx[1]) {
			return null;
		}
		return idx1;
	}, 12, 9);
	for (let i = 0; i < sol1.length; i++) {
		let move = sol1[i];
		KiloCubie.KiloMult(kc0, KiloCubie.moveCube[move[0] * 4 + move[1]], kc1);
		kc0.init(kc1.perm, kc1.twst);
	}
	console.log('[kilo] Phase1 in ', +new Date - tt);

	//phase2
	let doPhase2Move = comb3FullMove.bind(null, Phase2Move);
	val0 = phase2Coord.get(kc0, 3);
	KiloCubie.KiloMult3(KiloCubie.symCube[KiloCubie.symMulI[0][1]], kc0, KiloCubie.symCube[1], kc1);
	val1 = phase2Coord.get(kc1, 3);
	idx = [val0[0] * 27 * 6 + val0[1] * 27 + val0[2], val1[0] * 27 * 6 + val1[1] * 27 + val1[2]];
	tt = +new Date;
	let sol2 = solve(idx, function(idx: number[]) {
		return idx[0] == 0 && idx[1] == 0;
	}, function(idx: number[]) {
		return Math.max(getPruning(Phase2Prun, idx[0]), getPruning(Phase2Prun, idx[1]));
	}, function(idx: number[], move: number) {
		let idx1 = [doPhase2Move(idx[0], move), doPhase2Move(idx[1], yMove[move])];
		if (idx1[0] == idx[0] && idx1[1] == idx[1]) {
			return null;
		}
		return idx1;
	}, 6, 14);
	for (let i = 0; i < sol2.length; i++) {
		let move = sol2[i];
		KiloCubie.KiloMult(kc0, KiloCubie.moveCube[move[0] * 4 + move[1]], kc1);
		kc0.init(kc1.perm, kc1.twst);
	}
	console.log('[kilo] Phase2 in ', +new Date - tt);

	//phase3
	let doPhase3Move = comb4FullMove.bind(null, Phase3Move);
	val0 = phase3Coord.get(kc0);
	KiloCubie.KiloMult3(KiloCubie.symCube[KiloCubie.symMulI[0][6]], kc0, KiloCubie.symCube[6], kc1);
	val1 = phase3Coord.get(kc1);
	KiloCubie.KiloMult3(KiloCubie.symCube[KiloCubie.symMulI[0][29]], kc0, KiloCubie.symCube[29], kc1);
	let val2 = phase3Coord.get(kc1);
	idx = [val0[0] * 81 * 24 + val0[1] * 81 + val0[2], val1[0] * 81 * 24 + val1[1] * 81 + val1[2], val2[0] * 81 * 24 + val2[1] * 81 + val2[2]];
	tt = +new Date;
	let sol3 = solve(idx, function(idx: number[]) {
		return idx[0] == 0 && idx[1] == 0 && idx[2] == 0;
	}, function(idx: number[]) {
		return Math.max(getPruning(Phase3Prun, idx[0]), getPruning(Phase3Prun, idx[1]), getPruning(Phase3Prun, idx[2]));
	}, function(idx: number[], move: number) {
		return [doPhase3Move(idx[0], move), doPhase3Move(idx[1], (move + 1) % 3), doPhase3Move(idx[2], (move + 2) % 3)];
	}, 3, 14);
	console.log('[kilo] Phase3 in ', +new Date - tt);
	console.log('[kilo] total length: ', sol1.length + sol2.length + sol3.length);
	return move2str(Array.prototype.concat(sol1, sol2, sol3));
}

function checkSolver() {
	init();
	let kc0 = new KiloCubie();
	let kc1 = new KiloCubie();
	let gen = [];
	for (let i = 0; i < 200; i++) {
		let move = rn(12);
		gen.push([move, 0]);
		KiloCubie.KiloMult(kc0, KiloCubie.moveCube[move * 4], kc1);
		kc0.init(kc1.perm, kc1.twst);
	}
	return move2str(gen) + '   ' + solveKiloCubie(kc0);
}

function getScramble() {
	init();
	let cc = new KiloCubie();
	cc.perm = rndPerm(20, true);
	let chksum = 60;
	for (let i = 0; i < 19; i++) {
		let t = rn(3);
		cc.twst[i] = t;
		chksum -= t;
	}
	cc.twst[19] = chksum % 3;
	return solveKiloCubie(cc);
}

regScrambler('klmso', getScramble);