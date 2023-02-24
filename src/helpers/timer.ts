import { Penalty, type Solve } from "@interfaces";

export function timer(val: number, dec?: boolean, suff?: boolean, html?: boolean): string {
  if ( val === Infinity ) return "DNF";
  if ( isNaN(val) ) return ( dec ) ? "0.00" : "0";

  let v = ~~(val / 10);
  let ms = v % 100; v = ~~(v / 100);
  let s = v % 60;   v = ~~(v / 60);
  let m = v % 60;   v = ~~(v / 60);
  let h = v % 60;   v = ~~(v / 60);
  let p1 = [h, m].filter(e => e != 0);
  
  p1.push(s);

  let sf = [ 's', 'm', 'h' ][ p1.length - 1 ];
  let _html = ~~(html || 0);

  let newP1 = p1.map((e, p) => {
    if ( p > 0 )
      return ['', '<span class="digit">'][_html] + ("00" + e).substr(-2, 2) + ['', '</span>'][_html];
    return ['', '<span class="digit">'][_html] + e + ['', '</span>'][_html];
  }).join(":");

  let time = (( dec || (suff && sf === 's') )
    ? newP1 + `.${['', '<span class="digit">'][_html] + ('00' + ms).substr(-2, 2) + ['', '</span>'][_html]}`
    : newP1);

  return time + ((suff) ? sf : '');
}

export function sTimer(s: Solve, dec?: boolean, suff?: boolean, html?: boolean): string {
  if ( s.penalty === Penalty.DNS ) return 'DNS';
  if ( s.penalty === Penalty.DNF ) return 'DNF';
  return timer(s.time, dec, suff, html);
}

export function infinitePenalty(s: Solve): boolean {
  return s.penalty === Penalty.DNF || s.penalty === Penalty.DNS;
}