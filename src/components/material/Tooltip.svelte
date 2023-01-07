<script lang="ts">
  import { onMount } from 'svelte';

  type Direction = 'right' | 'left' | 'top' | 'bottom';

  export let text = 'tooltip';
  export let position: Direction = 'right';
  export let duration = 200;
  export let delay = 200;
  let _class = '';
  export { _class as class };

  let isVisible = false;
  let elem: HTMLElement, tt: HTMLElement, x, y, tx, ty, tr;

  function mouseenter() { resize(); isVisible = true; }
  function mouseleave() { isVisible = false; }

  function hasTransform(e): boolean {
    return e.computedStyleMap().get('transform').constructor.name === 'CSSTransformValue';
  }

  function resize() {
    let ce = elem.getBoundingClientRect();
    let ct = tt.getBoundingClientRect();

    x = ce.x; y = ce.y;

    let e1 = elem;

    do {
      e1 = e1.parentElement;
      if ( hasTransform(e1) ) {
        let cp = e1.getBoundingClientRect();
        x -= cp.x;
        y -= cp.y;
        break;
      }
    } while ( e1.parentElement );

    if ( position === 'right' || position === 'left' ) {
      x = position === 'left' ? `calc(${x - ct.width}px - 0.5rem)` : `calc(${x + ce.width}px + 0.5rem)`;
      y = `${y + (ce.height - ct.height) / 2}px`;
      tx = position === 'right' ? `-.29rem` : `calc(100% - .25rem)`;
      ty = 'calc(50% - .25rem)';
      tr = position === 'right' ? `-45deg` : `135deg`;
    }
    else {
      x = `${x + (ce.width - ct.width) / 2}px`
      y = position === 'top' ? `calc(${y - ct.height}px - 0.5rem)` : `calc(${y + ce.height}px + 0.5rem)`;
      tx = 'calc(50% - .25rem)';
      ty = position === 'top' ? `calc(100% - .21rem)` : `-.28rem`;
      tr = position === 'top' ? `-135deg` : `45deg`;
    }
  }

  onMount(() => {
    resize();
  });
</script>

<svelte:window on:resize={ resize }></svelte:window>

<div
  on:mouseenter={mouseenter}
  on:mouseleave={mouseleave}
  on:click
  bind:this={ elem }
  style={
    '--duration: ' + duration + 'ms;\
    --delay: ' + delay + 'ms;\
    --x: ' + x + ';\
    --y: ' + y + ';\
    --tx: ' + tx + ';\
    --ty: ' + ty + ';\
    --tr: ' + tr + ';'
  }
  class={'wrapper ' + _class}>
  <slot />
  
  <div
  bind:this={tt}
  class:visible={isVisible}
  class="tooltip">{text}</div>
</div>

<style lang="postcss">
  .wrapper {
    @apply w-fit h-fit;
    display: initial;
  }

  .tooltip {
    @apply fixed bg-neutral-600 px-3 py-2
      rounded-sm flex transition-all text-neutral-200;
    width: max-content;
    max-width: 14rem;
    transition-duration: var(--duration);
    transition-delay: var(--delay);
    left: var(--x);
    top: var(--y);
    z-index: 999;
    font-size: 1rem;
  }

  .tooltip:not(.visible) {
    @apply opacity-0 pointer-events-none select-none;
  }

  .tooltip::before {
    content: '';
    @apply absolute w-2 h-2 bg-neutral-600
      border border-gray-600;
    left: var(--tx);
    top: var(--ty);
    transform: rotate( var(--tr) );
    border-right: none;
    border-bottom: none;
  }
</style>