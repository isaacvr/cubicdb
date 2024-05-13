import { MultiSet } from "@classes/MultiSet";
import { AverageSetting, Penalty, type Session, type Solve, type Statistics, type TurnMetric } from "@interfaces";
import { adjustMillis, infinitePenalty } from "./timer";
import { scrambleReg } from "@classes/scramble-parser";

export const INITIAL_STATISTICS: Statistics = {
  best: { value: 0, better: false, prev: Infinity },
  worst: { value: 0, better: false },
  count: { value: 0, better: false },
  time: { value: 0, better: false },
  avg: { value: 0, better: false },
  dev: { value: 0, better: false },
  Mo3: { value: -1, better: false },
  Ao5: { value: -1, better: false },
  Ao12: { value: -1, better: false },
  Ao50: { value: -1, better: false },
  Ao100: { value: -1, better: false },
  Ao200: { value: -1, better: false },
  Ao500: { value: -1, better: false },
  Ao1k: { value: -1, better: false },
  Ao2k: { value: -1, better: false },

  NP:    { value: 0, better: false },
  P2:    { value: 0, better: false },
  DNS:   { value: 0, better: false },
  DNF:   { value: 0, better: false },
  counter: { value: 0, better: false },
};

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
  let set: MultiSet<number> = new MultiSet();
  let d = (n === 3) ? 0 : Math.ceil(n * 0.05);
  let len = arr.length - 1;
  let infP = 0;
  let sum = 0;
  
  let getIndex = (i: number) => len - i;

  for (let i = 0, maxi = len; i <= maxi; i += 1) {
    let t = arr[ getIndex(i) ];

    set.add( t );
    infP += (isFinite(t) ? 0 : 1);
    sum += (isFinite(t) ? t : 0);
    
    if ( i + 1 < n ) {
      res.push( null );
    } else {
      if ( infP > d ) {
        res.push( null );
      } else {
        let elems = set.toArray();
        let s = sum;
        
        elems.slice(0, d).forEach(v => s -= v);
        d && elems.slice(-d).filter(isFinite).forEach(v => s -= v);

        res.push( s / (n - 2 * d) );
      }

      if ( calc === AverageSetting.SEQUENTIAL ) {
        let t1 = arr[ getIndex(i - n + 1) ];
        set.rem( t1 );
        infP -= (isFinite(t1) ? 0 : 1);
        sum -= (isFinite(t1) ? t1 : 0);
      } else {
        set.clear();
        infP = sum = 0;
      }
      
    }
  }

  return res;
}

export function getAverageS(n: number, arr: Solve[], calc: AverageSetting): (number | null)[] {
  return getAverage(n, arr.map(e => infinitePenalty(e) ? Infinity : e.time), calc);
}

export function bundleAverageS(N: number[], BEST: number[], BEST_IDS: string[], IS_BEST: boolean[],
  PREV_BEST: number[], arr: Solve[], calc: AverageSetting ): (number | null)[][] {

  let res: (number | null)[][] = new Array(N.length).fill(0).map(_ => []);
  let sets: MultiSet<number>[] = new Array(N.length).fill(0).map(_ => new MultiSet());
  let disc = N.map(n => (n === 3) ? 0 : Math.ceil(n * 0.05));
  let len = arr.length - 1;
  let infP: number[] = new Array(N.length).fill(0);
  let sums: number[] = new Array(N.length).fill(0);
  
  let getIndex = (i: number) => len - i;
  let getTime = (s: Solve) => infinitePenalty(s) ? Infinity : adjustMillis(s.time);

  for (let i = 0, maxi = arr.length; i < maxi; i += 1) {
    let ip = getIndex(i);

    for (let j = 0, maxj = N.length; j < maxj; j += 1) {
      let t = getTime( arr[ip] );
      let d = disc[j];

      sets[j].add( t );
      infP[j] += (isFinite(t) ? 0 : 1);
      sums[j] += (isFinite(t) ? t : 0);
      
      if ( i + 1 < N[j] ) {
        res[j].push( null );
      } else {
        if ( infP[j] > d ) {
          res[j].push( null );
        } else {
          let elems = sets[j].toArray();
          let s = sums[j];
          
          elems.slice(0, d).forEach(v => s -= v);
          d && elems.slice(-d).filter(isFinite).forEach(v => s -= v);

          let av = s / (N[j] - 2 * d);

          if ( av < BEST[j] ) {
            BEST[j] = adjustMillis(av, true);
            BEST_IDS[j] = arr[ip]._id;
            IS_BEST[j] = PREV_BEST[j] != Infinity;
          }

          res[j].push( av );
        }

        if ( calc === AverageSetting.SEQUENTIAL ) {
          let t1 = getTime( arr[ getIndex(i - N[j] + 1) ]);
          sets[j].rem( t1 );
          infP[j] -= (isFinite(t1) ? 0 : 1);
          sums[j] -= (isFinite(t1) ? t1 : 0);

        } else {
          sets[j].clear();
          infP[j] = 0;
          sums[j] = 0;
        }
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
  const MAXP = ~~(width * PPP);

  if ( arr.length <= MAXP  ) {
    return arr;
  }

  const f = (arr.length - 1) / (MAXP - 1);

  return (new Array(MAXP)).fill(0).map((e, p) => arr[Math.floor(p * f)]);
}

export function decimateN(arr: (number | null)[], width: number): (number | null)[] {
  return decimateT<number | null>(arr, width);
}

export function decimate(arr: Solve[], width: number): Solve[] {
  return decimateT<Solve>(arr, width);
}

export function getUpdatedStatistics(stats: Statistics, solves: Solve[], session: Session, AON: number[], inc?: boolean): {
  stats: Statistics,
  window: (number | null)[][],
} {
  let AVG: number[] = [];
  let BEST: number[] = [
    stats.Mo3.best ?? Infinity,
    stats.Ao5.best ?? Infinity,
    stats.Ao12.best ?? Infinity,
    stats.Ao50.best ?? Infinity,
    stats.Ao100.best ?? Infinity,
    stats.Ao200.best ?? Infinity,
    stats.Ao500.best ?? Infinity,
    stats.Ao1k.best ?? Infinity,
    stats.Ao2k.best ?? Infinity,
    stats.best.best ?? Infinity,
    stats.worst.best ?? 0,
  ];

  let PREV_BEST = BEST.slice();

  let BEST_IDS: string[] = [
    stats.Mo3.id || '',
    stats.Ao5.id || '',
    stats.Ao12.id || '',
    stats.Ao50.id || '',
    stats.Ao100.id || '',
    stats.Ao200.id || '',
    stats.Ao500.id || '',
    stats.Ao1k.id || '',
    stats.Ao2k.id || '',
    stats.best.id || '',
    stats.worst.id || '',
  ];

  let IS_BEST = BEST.map(() => false);

  let len = solves.length;
  let sum = 0, avg = 0, dev = 0;
  let pMap: Map<Penalty, number> = new Map();

  solves.reduce((ac: number[], e) => {
    pMap.set( e.penalty, (pMap.get(e.penalty) || 0) + 1 );

    if ( infinitePenalty(e) ) {
      len -= 1;
      return ac;
    }
    
    sum += e.time;
    
    if ( e.time < BEST[9] ) {
      BEST_IDS[9] = e._id;
      BEST[9] = e.time;
      IS_BEST[9] = PREV_BEST[9] != Infinity;
    }
    
    if ( e.time > ac[1] ) {
      BEST_IDS[10] = e._id;
      BEST[10] = e.time;
      IS_BEST[10] = PREV_BEST[10] != 0;
    }

    return [ Math.min(ac[0], e.time), Math.max(ac[1], e.time) ];
  }, [Infinity, 0]);
  
  avg = (len > 0) ? sum / len : 0;
  dev = (len > 0) ? Math.sqrt( solves.reduce((acc, e) => {
    return infinitePenalty(e) ? acc : (acc + (e.time - avg)**2 / len);
  }, 0) ) : 0;
  
  let avgs = bundleAverageS(AON, BEST, BEST_IDS, IS_BEST, PREV_BEST, solves, session?.settings?.calcAoX || AverageSetting.SEQUENTIAL);
  
  AVG = avgs.map(a => a.slice(-1)[0] || -1);

  let ps = Object.assign({}, stats);

  return {
    stats: {
      best:  { value: BEST[9], better: IS_BEST[9], best: BEST[9], prev: PREV_BEST[9], id: BEST_IDS[9] },
      worst: { value: BEST[10], better: false, best: BEST[10], prev: PREV_BEST[10], id: BEST_IDS[10] },
      avg:   { value: avg, better: false },
      dev:   { value: dev, better: false },
      count: { value: solves.length, better: false },
      time:  { value: sum, better: false },
      Mo3:   { value: AVG[0], better: IS_BEST[0], best: BEST[0], prev: PREV_BEST[0], id: BEST_IDS[0] },
      Ao5:   { value: AVG[1], better: IS_BEST[1], best: BEST[1], prev: PREV_BEST[1], id: BEST_IDS[1] },
      Ao12:  { value: AVG[2], better: IS_BEST[2], best: BEST[2], prev: PREV_BEST[2], id: BEST_IDS[2] },
      Ao50:  { value: AVG[3], better: IS_BEST[3], best: BEST[3], prev: PREV_BEST[3], id: BEST_IDS[3] },
      Ao100: { value: AVG[4], better: IS_BEST[4], best: BEST[4], prev: PREV_BEST[4], id: BEST_IDS[4] },
      Ao200: { value: AVG[5], better: IS_BEST[5], best: BEST[5], prev: PREV_BEST[5], id: BEST_IDS[5] },
      Ao500: { value: AVG[6], better: IS_BEST[6], best: BEST[6], prev: PREV_BEST[6], id: BEST_IDS[6] },
      Ao1k:  { value: AVG[7], better: IS_BEST[7], best: BEST[7], prev: PREV_BEST[7], id: BEST_IDS[7] },
      Ao2k:  { value: AVG[8], better: IS_BEST[8], best: BEST[8], prev: PREV_BEST[8], id: BEST_IDS[8] },
      
      // Penalties
      NP:    { value: pMap.get(Penalty.NONE) || 0, better: false },
      P2:    { value: pMap.get(Penalty.P2) || 0, better: false },
      DNS:   { value: pMap.get(Penalty.DNS) || 0, better: false },
      DNF:   { value: pMap.get(Penalty.DNF) || 0, better: false },
      counter: { value: (inc) ? ps.counter.value + 1 : ps.counter.value, better: false },
    },
    window: avgs
  };
}

export function computeMoves(scramble: string, metric: TurnMetric): {
  moves: number, values: any[][]
} {
  let scr = scramble.split(/\s+/g).filter( m => scrambleReg.test(m) );
  let cant = 0;
  let values: any[][] = [];

  for (let i = 0, maxi = scr.length; i < maxi; i += 1) {
    let isRotation = /^[xyz]([2'])?$/.test(scr[i]);
    let isSlice = /^[EMS]([2'])?$/.test(scr[i]);
    let isDouble = scr[i].includes('2');
    let isBlock = /^[frubld]([2'])?$/.test(scr[i]) || /[w]/.test(scr[i]);
    let isNormal = /^([FRUBLD])([2'])?$/.test(scr[i]);
    let v = 0;

    if ( metric === 'HTM' ) {
      v = isSlice ? 2 : isNormal ? 1 : 0;
    } else if ( metric === 'OBTM' ) {
      v = (isNormal || isBlock) ? 1 : 0;
    } else if ( metric === 'QTM' ) {
      v = isSlice ? isDouble ? 4 : 2 : isNormal ? isDouble ? 2 : 1 : 0;
    } else if ( metric === 'ETM' ) {
      v = 1;
    } else if ( metric === 'STM' ) {
      v = isRotation ? 0 : 1;
    }

    cant += v;
    values.push([ scr[i], v ]);
  }

  return {
    moves: cant,
    values
  };
}

export function statsReplaceId(stats: Statistics, prevId: string, currId: string) {
  stats.Mo3.id = stats.Mo3.id === prevId ? currId : stats.Mo3.id;
  stats.Ao5.id = stats.Ao5.id === prevId ? currId : stats.Ao5.id;
  stats.Ao12.id = stats.Ao12.id === prevId ? currId : stats.Ao12.id;
  stats.Ao50.id = stats.Ao50.id === prevId ? currId : stats.Ao50.id;
  stats.Ao100.id = stats.Ao100.id === prevId ? currId : stats.Ao100.id;
  stats.Ao200.id = stats.Ao200.id === prevId ? currId : stats.Ao200.id;
  stats.Ao500.id = stats.Ao500.id === prevId ? currId : stats.Ao500.id;
  stats.Ao1k.id = stats.Ao1k.id === prevId ? currId : stats.Ao1k.id;
  stats.Ao2k.id = stats.Ao2k.id === prevId ? currId : stats.Ao2k.id;
  stats.best.id = stats.best.id === prevId ? currId : stats.best.id;
  stats.worst.id = stats.worst.id === prevId ? currId : stats.worst.id;
}