import { linear } from "svelte/easing";

interface Options {
  duration?: number;
  delay?: number;
  stagger?: number;
  easing?: (x: any) => any;
}

interface Rect {
  el: Element;
  left: number;
  top: number;
  width: number;
  height: number;
}

export class Flip {
  selector: string;
  defaults: Options;
  animating = false;

  constructor(selector: string, defaults: Options = {}) {
    this.selector = selector;
    this.defaults = defaults;
  }

  rect(el: Element): Rect {
    const rect = el.getBoundingClientRect().toJSON();
    return { el, ...rect };
  }

  measure() {
    const el = document.querySelector(this.selector);
    return this.rect(el!);
  }

  invert(el: Element, from: Rect, to: Rect, options: Options = {}) {
    this.animating = true;

    const anim = el.animate(
      [
        {
          width: `${from.width}px`,
          height: `${from.height}px`,
          maxWidth: "unset",
        },
        {
          width: `${to.width}px`,
          height: `${to.height}px`,
        },
      ],
      { fill: "backwards", duration: options.duration, delay: options.delay }
    );

    anim.addEventListener("finish", () => {
      this.animating = false;
    });
  }

  flip(options: Options = {}) {
    if (this.animating) return;

    const {
      duration = 1000,
      delay = 0,
      stagger = 0,
      easing = linear,
    } = { ...this.defaults, ...options };

    const from = this.measure();

    console.log("FROM: ", from);

    requestAnimationFrame(() => {
      const to = this.measure();
      console.log("TO: ", to);
      this.invert(from.el, from, to, { ...this.defaults, ...options });
    });
  }
}
