export function ripple(node, eProps) {
  let POSITION;
  let DURATION;
  let BACKGROUND;
  const ripple = document.createElement('span');
  node.appendChild(ripple);

  let initialize = (p) => {
    POSITION = (p || {}).position || 'cursor';
    DURATION = Math.abs((p || {}).duration || 400);
    BACKGROUND = (p || {}).background || "#fff";
  };

  initialize(eProps);

  let from = 0;
  let to = 0;
  let alpha = 0;
  let animating = false;

  let animate = (rpl) => {
    if ( animating ) {
      if ( performance.now() <= to ) {
        alpha = (performance.now() - from) * 1.2 / (to - from);
        rpl.style.transform = `translate(-50%, -50%) scale(${alpha})`;
        rpl.style.opacity = "" + (0.5 - 0.5 * alpha / 1.2);
        window.requestAnimationFrame(() => animate(rpl));
      } else {
        alpha = 0;
        rpl.style.transform = `translate(-50%, -50%) scale(${alpha})`;
        rpl.style.opacity = 0;
        animating = false;
        node.style.overflow = null;
      }
    }
  };

  const getProps = (e) => {
    let box = node.getBoundingClientRect();
    let w = box.width, h = box.height;
    if ( POSITION === 'center' ) {
      return {
        x: w / 2,
        y: h / 2,
        rad: ((w / 2) ** 2 + (h / 2) ** 2) ** .5 
      }
    }

    return {
      x: e.clientX - node.offsetLeft,
      y: e.clientY - node.offsetTop,
      rad: 2 * (w ** 2 + h ** 2) ** .5
    }
  }

  const handleClick = (e) => {
    let p = getProps(e);
   
    ripple.style.left = `${p.x}px`;
    ripple.style.top = `${p.y}px`;
    ripple.style.position = "absolute";
    ripple.style.background = BACKGROUND;
    ripple.style.pointerEvents = "none";
    ripple.style.width = p.rad + "px";
    ripple.style.height = p.rad + "px";
    ripple.style.borderRadius = "50%";
    ripple.style.opacity = "0.5";
    ripple.style.borderRadius = '50%';

    node.style.overflow = 'hidden';
    from = performance.now();
    to = from + DURATION;

    !animating && (animating = true) && animate(ripple);
  };

  node.addEventListener('click', handleClick);

  return {
    update(p) {
      initialize(p);
    },

    destroy() {
      node.removeEventListener('click', handleClick);
      ripple.remove();
    }
  }
}