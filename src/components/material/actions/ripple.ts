import { Color } from "@classes/Color";

type RIPPLE_POSITION = 'center' | 'cursor';
type PROPS = { position?: RIPPLE_POSITION, duration?: number, background?: string } | boolean;

/** @type {import('svelte/action').Action}  */
export function ripple(node: HTMLElement, eProps: PROPS) {
  let POSITION: RIPPLE_POSITION;
  let DURATION: number;
  let BACKGROUND = new Color();

  let initialize = (p: PROPS) => {
    let _p: PROPS;

    if ( typeof p === 'boolean' ) {
      if (!p) {
        return DURATION = 0;
      }

      _p = {
        position: 'cursor',
        duration: 400,
        background: '#fff'
      };
    } else {
      _p = p;
    }

    POSITION = _p.position || 'cursor';
    DURATION = Math.abs(_p.duration || 400);
    BACKGROUND.fromString( _p.background || "#fff" );
  };

  initialize(eProps);

  const getProps = (e: MouseEvent) => {
    let box = node.getBoundingClientRect();
    let w = box.width, h = box.height;
    if ( POSITION === 'center' ) {
      return { x: w / 2, y: h / 2 };
    }

    let p = node.getBoundingClientRect();

    return {
      x: e.clientX - p.x,
      y: e.clientY - p.y
    }
  }

  const handleClick = (e: MouseEvent) => {
    initialize(eProps);

    BACKGROUND.set(3, 0.5);

    let { x, y } = getProps(e);

    node.classList.remove('ripple');
    void node.offsetWidth;

    node.style.setProperty('--x', x + 'px');
    node.style.setProperty('--y', y + 'px');
    node.style.setProperty('--color1', BACKGROUND.toHex());
    node.style.setProperty('--color2', 'transparent');
    node.style.setProperty('--duration', DURATION + 'ms');
    
    node.classList.add('ripple');
  };

  node.addEventListener('click', handleClick);

  return {
    update(p: any) {
      initialize(p);
    },

    destroy() {
      node.removeEventListener('click', handleClick);
    }
  }
}