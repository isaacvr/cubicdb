import { Puzzle } from "@classes/puzzle/puzzle";
import { DOWN } from "@classes/vector3d";
import { EPS } from "@constants";
import { nameToPuzzle, type Algorithm, type PuzzleType } from "@interfaces";

export function checkPath(obj: any, path: string[], useMap: boolean = false): boolean {
  if (typeof obj === "undefined") return false;

  let tmp = obj;

  for (let i = 0, maxi = path.length - 1; i < maxi; i += 1) {
    if (typeof tmp === "undefined") return false;

    if (useMap && tmp.has(path[i])) {
      tmp = tmp.get(path[i]);
    } else if (!useMap && Object.prototype.hasOwnProperty.call(tmp, path[i])) {
      tmp = tmp[path[i]];
    } else {
      return false;
    }
  }

  return true;
}

export function pushPath(obj: any, path: string[], value: any, useMap: boolean = false): any {
  if (typeof obj === "undefined") return obj;

  path.reduce((acc, p, pos) => {
    if (pos + 1 === path.length) {
      if (useMap) {
        acc.get(p).push(value);
      } else {
        acc[p].push(value);
      }
    }

    return useMap ? acc.get(p) : acc[p];
  }, obj);

  return obj;
}

export function createPath(obj: any, path: string[], def: any, useMap: boolean = false): any {
  if (typeof obj === "undefined") return obj;

  const objSetter = (o: any, p: any, v: any) => (o[p] = v);
  const mapSetter = (m: Map<any, any>, p: any, v: any) => m.set(p, v);

  path.reduce((acc, p, pos) => {
    let altV = pos + 1 === path.length ? def : useMap ? new Map<string, any>() : {};

    if ((!pos && acc instanceof Map) || (pos && useMap)) {
      mapSetter(acc, p, altV);
    } else {
      objSetter(acc, p, acc[p] || altV);
    }

    return acc instanceof Map ? acc.get(p) : acc[p];
  }, obj);

  return obj;
}

export function clone(obj: any, ignore: string[] = []): any {
  switch (typeof obj) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
    case "function":
      return obj;
  }

  if (obj === null) return obj;

  if (typeof obj === "bigint") {
    return BigInt(obj);
  }

  if (Array.isArray(obj)) return obj.map(e => clone(e));

  return Object.entries(obj).reduce((acc: any, e) => {
    if (ignore.indexOf(e[0]) > -1) return acc;

    acc[e[0]] = clone(e[1]);
    return acc;
  }, {});
}

export function getUint8DataView(dt: DataView): Uint8Array {
  let res = new Array(dt.byteLength);

  for (let i = 0, maxi = dt.byteLength; i < maxi; i += 1) {
    res[i] = dt.getUint8(i);
  }

  return Uint8Array.from(res);
}

export function binSearch<T>(elem: T, arr: T[], cmp: (a: T, b: T) => number) {
  let from = 0;
  let to = arr.length;

  while (from < to) {
    let mid = (to + from) >> 1;
    let comp = cmp(elem, arr[mid]);

    if (comp === 0) {
      return mid;
    }

    if (comp < 0) {
      to = mid;
    } else {
      from = mid + 1;
    }
  }

  return -1;
}

export function getByteSize(obj: any): number {
  switch (typeof obj) {
    case "boolean":
      return 4;
    case "number":
      return 8;
    case "string":
      return obj.length * 2;
    case "undefined":
      return 4;
    case "function":
      return JSON.stringify(obj).length;
  }

  if (obj === null) return 4;

  if (typeof obj === "bigint") {
    let b = BigInt(obj);

    if (b < 0n) b = b * -1n;

    let s = b.toString();
    let pot = s.length - 1;
    let base = +(s[0] + "." + (s.slice(1) || "0"));
    return b === 0n ? 4 : (2 + Math.ceil(((Math.log10(base) + pot) / Math.log(2) + 1) / 64)) * 8;
  }

  if (Array.isArray(obj)) {
    return obj.reduce((acc, o) => acc + getByteSize(o), 0);
  }

  return Object.entries(obj).reduce((acc: any, e) => {
    return acc + getByteSize(e[0]) + getByteSize(e[1]);
  }, 0);
}

export function algorithmToPuzzle(alg: Algorithm, addZ2: boolean): Puzzle {
  let args = nameToPuzzle(alg.puzzle || "");
  let noZ2: PuzzleType[] = ["megaminx", "pyraminx"];
  let seq = alg.scramble + (addZ2 && noZ2.indexOf(args.type) === -1 ? " z2" : "");

  let res = Puzzle.fromSequence(
    seq,
    {
      type: args.type,
      order: args.dims.length === 0 ? [alg.order] : args.dims,
      mode: alg.mode,
      view: alg.view,
      tips: alg.tips,
      headless: true,
      rounded: true,
    },
    true,
    true
  );

  res.p.rotation = alg.rotation || res.p.rotation;

  return res.adjustColors("", alg.baseColor || (args.type === "pyraminx" ? "y" : "w"));
}
