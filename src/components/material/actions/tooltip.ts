import { getStackingContext } from "@helpers/DOM";
import { processKey } from "@helpers/strings";

type Direction = 'right' | 'left' | 'top' | 'bottom';

type PROPS = {
  text?: string;
  position?: Direction;
  duration?: number;
  delay?: number;
  hasKeybinding?: boolean;
  class?: string;
};

/** @type {import('svelte/action').Action}  */
export function tooltip(node: HTMLElement, eProps: PROPS) {
  let text = 'tooltip';
  let position: Direction = 'right';
  let duration = 200;
  let delay = 200;
  let hasKeybinding = false;
  let _class = '';

  let tt = document.createElement('div');
  node.append(tt);

  function mouseenter() {
    resize();
    let pt = processKey(text);

    tt.innerHTML = `${ hasKeybinding ? pt[0] + `&nbsp; <span class="flex ml-auto text-yellow-400">${ pt[1] }</span>` : text }`;
    tt.classList.add('visible', 'tooltip');
  }

  function mouseleave() {
    tt.classList.remove('visible');
  }

  function resize() {
    let ce = node.getBoundingClientRect();
    let ct = tt.getBoundingClientRect();

    let _x = ce.x;
    let _y = ce.y;

    let e1: HTMLElement | null | undefined = getStackingContext(node);
    let cp = e1.getBoundingClientRect();

    if ( e1.getAttribute('data-type') != 'modal' ) {
      _x -= cp.x;
      _y -= cp.y;
    }

    let x: string, y: string;
    let tx: string, ty: string, tr: string;

    if ( position === 'right' || position === 'left' ) {
      x = position === 'left' ? `calc(${_x - ct.width}px - 0.5rem)` : `calc(${_x + ce.width}px + 0.5rem)`;
      y = `${_y + (ce.height - ct.height) / 2}px`;
      tx = position === 'right' ? `-.29rem` : `calc(100% - .25rem)`;
      ty = 'calc(50% - .25rem)';
      tr = position === 'right' ? `-45deg` : `135deg`;
    } else {
      x = `${_x + (ce.width - ct.width) / 2}px`
      y = position === 'top' ? `calc(${_y - ct.height}px - 0.5rem)` : `calc(${_y + ce.height}px + 0.5rem)`;
      tx = 'calc(50% - .25rem)';
      ty = position === 'top' ? `calc(100% - .21rem)` : `-.28rem`;
      tr = position === 'top' ? `-135deg` : `45deg`;
    }

    tt.style.setProperty('--duration', duration + 'ms');
    tt.style.setProperty('--delay', delay + 'ms');
    tt.style.setProperty('--x', x);
    tt.style.setProperty('--y', y);
    tt.style.setProperty('--tx', tx);
    tt.style.setProperty('--ty', ty);
    tt.style.setProperty('--tr', tr);

    console.log("PARENT: ", ce, cp, x, y);
  }

  function initialize(p: PROPS) {
    text = p.text || 'tooltip';
    position = p.position || 'right';
    duration = p.duration || 200;
    delay = p.delay || 200;
    hasKeybinding = !!p.hasKeybinding;
    _class = p.class || '';

    let classes = _class.split(/\s+/).filter(e => e);

    classes.length && tt.classList.add(...classes);
  }

  initialize(eProps);

  node.addEventListener('mouseenter', mouseenter);
  node.addEventListener('mouseleave', mouseleave);

  return {
    update(p: PROPS) {
      initialize(p);
      resize();
    },

    destroy() {
      node.removeEventListener('mouseenter', mouseenter);
      node.removeEventListener('mouseleave', mouseleave);
      tt.remove();
    }
  }
}