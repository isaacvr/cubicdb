import { Color } from "@classes/Color";
import { getStackingContext } from "@helpers/DOM";

export function ripple(node: HTMLElement, eProps: any) {
  let POSITION: string;
  let DURATION: number;
  let BACKGROUND = new Color();
  // const ripple = document.createElement('span');
  // node.appendChild(ripple);

  let initialize = (p: any) => {
    POSITION = (p || {}).position || 'cursor';
    DURATION = Math.abs((p || {}).duration || 400);
    BACKGROUND.fromString( (p || {}).background || "#fff" );
  };

  initialize(eProps);

  // node.classList.add('ripple');

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