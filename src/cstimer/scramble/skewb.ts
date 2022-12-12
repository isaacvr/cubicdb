import { acycle, coord, fillFacelet, rn, Solver } from '../lib/mathlib';
import { regScrambler } from './scramble';

/**	1 2   U
	 0  LFRB
	3 4   D  */
//centers: U R F B L D
//twstcor: URF ULB DRB DLF
//fixedco: UBR UFL DFR DBL

let fixedCorn = [
	[4, 16, 7], // U4 B1 R2
	[1, 11, 22], // U1 F1 L2
	[26, 14, 8], // D1 F4 R3
	[29, 19, 23] // D4 B4 L3
];

let twstCorn = [
	[3, 6, 12], // U3 R1 F2
	[2, 21, 17], // U2 L1 B2
	[27, 9, 18], // D2 R4 B3
	[28, 24, 13] // D3 L4 F3
];

function checkNoBar(perm, _twst) {
	let corner = cpcord.set([], perm % 12);
	let center = ctcord.set([], ~~(perm / 12));
	let fixedtwst = ftcord.set([], _twst % 81);
	let twst = twcord.set([], ~~(_twst / 81));
	let f = [];
	for (let i = 0; i < 6; i++) {
		f[i * 5] = center[i];
	}
	fillFacelet(fixedCorn, f, [0, 1, 2, 3], fixedtwst, 5);
	fillFacelet(twstCorn, f, corner, twst, 5);
	for (let i = 0; i < 30; i += 5) {
		for (let j = 1; j < 5; j++) {
			if (f[i] == f[i + j]) {
				return false;
			}
		}
	}
	return true;
}

let moveCenters = [
	[0, 3, 1],
	[0, 2, 4],
	[1, 5, 2],
	[3, 4, 5]
];

let moveCorners = [
	[0, 1, 2],
	[0, 3, 1],
	[0, 2, 3],
	[1, 3, 2]
];

let ctcord = new coord('p', 6, -1);
let cpcord = new coord('p', 4, -1);
let ftcord = new coord('o', 4, 3);
let twcord = new coord('o', 4, -3);

function ctcpMove(idx, m) {
	let corner = cpcord.set([], idx % 12);
	let center = ctcord.set([], ~~(idx / 12));
	acycle(center, moveCenters[m]);
	acycle(corner, moveCorners[m]);
	return ctcord.get(center) * 12 + cpcord.get(corner);
}

function twstMove(idx, move) {
	let fixedtwst = ftcord.set([], idx % 81);
	let twst = twcord.set([], ~~(idx / 81));
	fixedtwst[move]++;
	acycle(twst, moveCorners[move], 1, [0, 2, 1, 3]);
	return twcord.get(twst) * 81 + ftcord.get(fixedtwst);
}

let solv = new Solver(4, 2, [
	[0, ctcpMove, 4320],
	[0, twstMove, 2187]
]);

let solvivy = new Solver(4, 2, [
	[0, function(idx, m) {
		return ~~(ctcpMove(idx * 12, m) / 12);
	}, 360],
	[0, function(idx, m) {
		return twstMove(idx, m) % 81;
	}, 81]
]);


function sol2str(sol) {
	let ret = [];
	let move2str = ["L", "R", "B", "U"]; //RLDB (in jaap's notation) rotated by z2
	for (let i = 0; i < sol.length; i++) {
		let axis = sol[i][0];
		let pow = 1 - sol[i][1];
		if (axis == 2) { //step two.
			acycle(move2str, [0, 3, 1], pow + 1);
		}
		ret.push(move2str[axis] + ((pow == 1) ? "'" : ""));
	}
	return ret.join(" ");
}

let ori = [0, 1, 2, 0, 2, 1, 1, 2, 0, 2, 1, 0];

function getScramble(type) {
	let perm, twst;
	let lim = type == 'skbso' ? 6 : 2;
	let minl = type == 'skbo' ? 0 : 8;
	do {
		perm = rn(4320);
		twst = rn(2187);
	} while (
		perm == 0 && twst == 0 ||
		ori[perm % 12] != (twst + ~~(twst / 3) + ~~(twst / 9) + ~~(twst / 27)) % 3 ||
		solv.search([perm, twst], 0, lim) != null ||
		type == 'skbnb' && !checkNoBar(perm, twst));
	return sol2str(solv.search([perm, twst], minl).reverse());
}

function getScrambleIvy(type) {
	let perm, twst, lim = 1,
		maxl = type == 'ivyso' ? 6 : 0;
	do {
		perm = rn(360);
		twst = rn(81);
	} while (perm == 0 && twst == 0 || solvivy.search([perm, twst], 0, lim) != null);
	return solvivy.toStr(solvivy.search([perm, twst], maxl).reverse(), "RLDB", "' ");
}

regScrambler(['skbo', 'skbso', 'skbnb'], getScramble)
	(['ivyo', 'ivyso'], getScrambleIvy);