import { Penalty, type Solve } from "@interfaces";
import { toInt } from "./math";

export function timer(val: number, dec?: boolean, suff?: boolean): string {
  if ( val === Infinity || val === -Infinity ) return "DNF";
  if ( isNaN(val) ) return (dec ? "0.00" : "0") + (suff ? 's' : '');

  let v = ~~(val / 10);
  let ms = v % 100; v = ~~(v / 100);
  let s = v % 60;   v = ~~(v / 60);
  let m = v % 60;   v = ~~(v / 60);
  let h = v;

  const l2 = (s: number) => ("00" + s).slice(-2);

  let res = '';
  let sf = '';

  if ( h ) {
    res = `${ h }h ${ m }:${ l2(s) }`;
  } else if ( m ) {
    res = `${ m }:${ l2(s) }`;
    sf = 'm';
  } else {
    res = `${ s }`;
    sf = 's';
  }

  return res + (dec ? `.${ l2(ms) }` : '') + (suff ? sf : '');
}

export function sTimer(s: Solve | null, dec?: boolean, suff?: boolean): string {
  if ( !s ) return (dec ? '0.00' : '0') + (suff ? 's' : '');
  if ( s.penalty === Penalty.DNS ) return 'DNS';
  if ( s.penalty === Penalty.DNF ) return 'DNF';
  return timer(s.time, dec, suff) + (s.penalty === Penalty.P2 ? "+" : "");
}

export function sTime(s: Solve | null): number {
  if ( !s ) return 0;
  if ( s.penalty === Penalty.DNS ) return Infinity;
  if ( s.penalty === Penalty.DNF ) return Infinity;
  return adjustMillis(s.time) + (s.penalty === Penalty.P2 ? 2000 : 0);
}

export function infinitePenalty(s: Solve): boolean {
  return s.penalty === Penalty.DNF || s.penalty === Penalty.DNS;
}

export function timerToMilli(n: number): number {
  let mtp = [ 10, 1_000, 60_000, 3_600_000 ]; // Multiplier up to hours
  let res = 0;

  for (let i = 0, maxi = mtp.length; i < maxi && n; i += 1) {
    let d = n % 100;
    res += d * mtp[i];

    n = ~~(n / 100);
  }
  
  return res + n * 86_400_000; // Add days
}

export function adjustMillis(n: number, round = false): number {
  return !round ? toInt(n, 1) : Math.round(n / 10) * 10;
}

export function formatHour(n: number): string {
  let res = (n % 12) || 12;
  let suff = ['am', 'pm'][ ~~(n >= 12) ];
  return res + suff;
}