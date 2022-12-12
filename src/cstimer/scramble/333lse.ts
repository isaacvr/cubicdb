import { acycle, getNParity, getNPerm, rn, set8Perm, Solver } from '../lib/mathlib';
import { regScrambler } from './scramble';

let edgePerms = [
	[0, 1, 2, 3],
	[0, 2, 5, 4]
];

let edgeOris = [
	[0, 0, 0, 0, 2],
	[0, 1, 0, 1, 2]
];

function doPermMove(idx, m) {
	let edge = idx >> 3;
	let corn = idx;
	let cent = idx << 1 | (getNParity(edge, 6) ^ ((corn >> 1) & 1));
	let g = set8Perm([], edge, 6);
	acycle(g, edgePerms[m]);

	if (m == 0) { //U
		corn = corn + 2;
	}
	if (m == 1) { //M
		cent = cent + 1;
	}
	return (getNPerm(g, 6) << 3) | (corn & 6) | ((cent >> 1) & 1);
}

function doOriMove(arr, m) {
	acycle(arr, edgePerms[m], 1, edgeOris[m]);
}

let solv = new Solver(2, 3, [
	[0, doPermMove, 5760],
	[0, [doOriMove, 'o', 6, -2], 32]
]);

function generateScramble() {
	let b, c;
	do {
		c = rn(5760);
		b = rn(32);
	} while (b + c == 0);
	return solv.toStr(solv.search([c, b], 0), "UM", " 2'").replace(/ +/g, ' ');
}

regScrambler('lsemu', generateScramble);