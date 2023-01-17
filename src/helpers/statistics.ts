import { AverageSetting, Penalty, type Solve } from "@interfaces";

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

export function getAverage(n: number, arr: number[], calc: AverageSetting): number[] {
  let res = [];
  let len = arr.length - 1;
  let elems = [];
  let disc = (n === 3) ? 0 : Math.ceil(n * 0.05);

  for (let i = 0, maxi = len; i <= maxi; i += 1) {
    if ( arr[len - i] === null ) {
      res.push(null);
      continue;
    }

    elems.push( arr[len - i] );

    if ( elems.length < n ) {
      res.push(null);
    } else {
      let e1 = elems.map(e => e).sort((a, b) => a - b);
      let sumd = e1.reduce((s, e, p) => {
        return (p >= disc && p < n - disc) ? s + e : s;
      }, 0);
      
      res.push( sumd / (n - disc * 2) );

      calc === AverageSetting.GROUP && (elems.length = 0);
      calc === AverageSetting.SEQUENTIAL && elems.shift();
    }
  }

  return res;
}

export function getAverageS(n: number, arr: Solve[], calc: AverageSetting): number[] {
  return getAverage(n, arr.map(e => e.penalty === Penalty.DNF ? Infinity : e.time), calc);
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