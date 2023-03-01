import { MultiSet } from "@classes/MultiSet";
import { AverageSetting, type Solve } from "@interfaces";
import { infinitePenalty } from "./timer";

export function mean(values: number[]): number {
  let cant = values.length;
  return cant ? values.reduce((a, b) => a + b, 0) / cant : 0;
}

export function median(values: number[]): number {
  let cant = values.length;
  let v1 = values.slice().sort((a, b) => a - b);
  if ( cant % 2 === 0 ) {
    return mean(v1.slice(cant / 2 - 1, cant / 2 + 1));
  }
  return v1[ cant >> 1 ];
}

export function getAverage(n: number, arr: number[], calc: AverageSetting): (number | null)[] {
  let res: (number | null)[] = [];
  let len = arr.length - 1;
  let elems: number[] = [];
  let disc = (n === 3) ? 0 : Math.ceil(n * 0.05);

  for (let i = 0, maxi = len; i <= maxi; i += 1) {
    elems.push( arr[len - i] );

    if ( elems.length < n ) {
      res.push(null);
    } else {
      let e1 = elems.slice().sort((a, b) => isFinite(a) && isFinite(b) ? a - b : isFinite(a) ? -1 : 1);
      let sumd = e1.reduce((s, e, p) => {
        return (p >= disc && p < n - disc) ? s + e : s;
      }, 0);
      
      res.push( isFinite(sumd) ? sumd / (n - disc * 2) : null);

      calc === AverageSetting.GROUP && (elems.length = 0);
      calc === AverageSetting.SEQUENTIAL && elems.shift();
    }
  }

  return res;
}

export function getAverageS(n: number, arr: Solve[], calc: AverageSetting): (number | null)[] {
  return getAverage(n, arr.map(e => infinitePenalty(e) ? Infinity : e.time), calc);
}

export function bundleAverageS(N: number[], arr: Solve[], calc: AverageSetting): (number | null)[][] {
  let res: (number | null)[][] = new Array(N.length).fill(0).map(_ => []);
  let sets: MultiSet<number>[] = new Array(N.length).fill(0).map(_ => new MultiSet());
  let disc = N.map(n => (n === 3) ? 0 : Math.ceil(n * 0.05));
  let len = arr.length - 1;

  for (let i = 0, maxi = arr.length; i < maxi; i += 1) {
    let ip = len - i;
    for (let j = 0, maxj = N.length; j < maxj; j += 1) {
      sets[j].add( infinitePenalty(arr[ip]) ? Infinity : arr[ip].time );
      if ( i + 1 < N[j] ) {
        res[j].push(null);
      } else {
        if ( calc === AverageSetting.SEQUENTIAL || (calc === AverageSetting.GROUP && (ip + 1) % N[j] === 0) ) {
          let d = disc[j];
          res[j].push( sets[j].toArray().slice(d || 0, -d || N[j]).reduce((a, b) => a + b, 0) / N[j] );
        } else {
          res[j].push(null);
        }

        sets[j].rem( infinitePenalty(arr[ip + N[j] - 1]) ? Infinity : arr[ip + N[j] - 1].time );
      }
    }
  }

  return res;
}

export function trendLSV(values: number[][]): { m: number, n: number } {
  const n = values.length;
  let Sx = 0, Sy = 0, Sxx = 0, Sxy = 0;
  
  for (let i = 0; i < n; i += 1) {
    let x = values[i][0], y = values[i][1];
    Sx += x; Sy += y;
    Sxx += x * x; Sxy += x * y;
  }

  let beta = (n * Sxy - Sx * Sy) / ( n * Sxx - Sx ** 2 );
  let alpha = (Sy - beta * Sx) / n;

  return { m: beta, n: alpha };
  
}

export function decimateT<T>(arr: T[], width: number): T[] {
  const PPP = 2; /// Points per Pixels
  const MAXP = width * PPP;

  if ( arr.length <= MAXP  ) {
    return arr;
  }

  return new Array(MAXP).fill(0).map((e, p) => arr[Math.round(p * (arr.length - 1) / (MAXP - 1))]);
}

export function decimateN(arr: (number | null)[], width: number): (number | null)[] {
  return decimateT<number | null>(arr, width);
}

export function decimate(arr: Solve[], width: number): Solve[] {
  return decimateT<Solve>(arr.filter(s => !infinitePenalty(s)), width);
} 