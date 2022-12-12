import { acycle, coord, fillFacelet, get8Perm, rn, set8Perm, Solver } from '../lib/mathlib';
import { regScrambler } from './scramble';

/*
x504x x x504x
	132 231 132
	x x405x x
		x504x
			132
			x  */
let cFacelet = [
	[3, 16, 11], // F3, L4, R5
	[4, 23, 15], // F4, D5, L3
	[5, 9, 22], // F5, R3, D4
	[10, 17, 21] // R4, L5, D3
];

let eFacelet = [
	[1, 7], // F1, R1
	[2, 14], // F2, L2
	[0, 18], // F0, D0
	[6, 12], // R0, L0
	[8, 20], // R2, D2
	[13, 19] // L1, D1
];

function checkNoBar(perm, ori) {
	let edgeOri = eocoord.set([], ori & 0x1f);
	let cornOri = cocoord.set([], ori >> 5);
	let edgePerm = epcoord.set([], perm);
	let f = [];
	fillFacelet(cFacelet, f, [0, 1, 2, 3], cornOri, 6);
	fillFacelet(eFacelet, f, edgePerm, edgeOri, 6);
	let pieces = [4, 2, 3, 1, 5, 0];
	for (let i = 0; i < 6; i++) {
		for (let j = 0; j < 2; j++) {
			let p1 = eFacelet[i][0 ^ j];
			let p2 = eFacelet[i][1 ^ j];
			let nb1 = ~~(p1 / 6) * 6 + pieces[(pieces.indexOf(p1 % 6) + 5) % 6];
			let nb2 = ~~(p2 / 6) * 6 + pieces[(pieces.indexOf(p2 % 6) + 1) % 6];
			if (f[nb1] == f[p1] && f[nb2] == f[p2]) {
				return false;
			}
		}
	}
	return true;
}

let solv = new Solver(4, 2, [
	[0, [epermMove, 'p', 6, -1], 360],
	[0, oriMove, 2592]
]);

let movePieces = [
	[0, 1, 3],
	[1, 2, 5],
	[0, 4, 2],
	[3, 5, 4]
];

let moveOris = [
	[0, 1, 0, 2],
	[0, 1, 0, 2],
	[0, 0, 1, 2],
	[0, 0, 1, 2]
];

function epermMove(arr, m) {
	acycle(arr, movePieces[m]);
}

let eocoord = new coord('o', 6, -2);
let epcoord = new coord('p', 6, -1);
let cocoord = new coord('o', 4, 3);

function oriMove(a, c) {
	let edgeOri = eocoord.set([], a & 0x1f);
	let cornOri = cocoord.set([], a >> 5);
	cornOri[c]++;
	acycle(edgeOri, movePieces[c], 1, moveOris[c]);
	return cocoord.get(cornOri) << 5 | eocoord.get(edgeOri);
}

function getScramble(type) {
	let minl = type == 'pyro' ? 0 : 8;
	let limit = type == 'pyrl4e' ? 2 : 7;
	let len = 0;
	let sol;
	let perm;
	let ori;
	do {
		if (type == 'pyro' || type == 'pyrso' || type == 'pyr4c') {
			perm = rn(360);
			ori = rn(2592);
		} else if (type == 'pyrl4e') {
			perm = get8Perm(set8Perm([], rn(12), 4, -1).concat([4, 5]), 6, -1);
			ori = rn(3) * 864 + rn(8);
		} else if (type == 'pyrnb') {
			do {
				perm = rn(360);
				ori = rn(2592);
			} while (!checkNoBar(perm, ori));
		}
		len = solv.search([perm, ori], 0).length;
		sol = solv.toStr(solv.search([perm, ori], minl).reverse(), "ULRB", ["'", ""]) + ' ';
		for (let i = 0; i < 4; i++) {
			let r = rn(type == 'pyr4c' ? 2 : 3);
			if (r < 2) {
				sol += "lrbu".charAt(i) + [" ", "' "][r];
				len++;
			}
		}
	} while (len < limit);
	return sol;
}

export function getRandomScramble() {
	return getScramble('pyro');
}

regScrambler(['pyro', 'pyrso', 'pyrl4e', 'pyrnb', 'pyr4c'], getScramble);