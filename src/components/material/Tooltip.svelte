<script lang="ts">
    import { processKey } from '@helpers/strings';
  import { onMount } from 'svelte';

  type Direction = 'right' | 'left' | 'top' | 'bottom';

  export let text = 'tooltip';
  export let position: Direction = 'right';
  export let duration = 200;
  export let delay = 200;
  export let hasKeybinding = false;
  let _class = '';
  export { _class as class };

  let isVisible = false;
  let elem: HTMLElement, tt: HTMLElement;
  let x: string, y: string;
  let tx: string, ty: string, tr: string;

  function mouseenter() { resize(); isVisible = true; }
  function mouseleave() { isVisible = false; }

  function hasTransform(e: any): boolean {
    return e.computedStyleMap().get('transform').constructor.name === 'CSSTransformValue';
  }

  function resize() {
    let ce = elem.getBoundingClientRect();
    let ct = tt.getBoundingClientRect();

    let _x = ce.x;
    let _y = ce.y;

    let e1: HTMLElement | null | undefined = elem;

    do {
      e1 = e1?.parentElement;
      if ( hasTransform(e1) ) {
        let cp = e1?.getBoundingClientRect();
        _x -= (cp?.x || 0);
        _y -= (cp?.y || 0);
        break;
      }
    } while ( e1?.parentElement );

    if ( position === 'right' || position === 'left' ) {
      x = position === 'left' ? `calc(${_x - ct.width}px - 0.5rem)` : `calc(${_x + ce.width}px + 0.5rem)`;
      y = `${_y + (ce.height - ct.height) / 2}px`;
      tx = position === 'right' ? `-.29rem` : `calc(100% - .25rem)`;
      ty = 'calc(50% - .25rem)';
      tr = position === 'right' ? `-45deg` : `135deg`;
    }
    else {
      x = `${_x + (ce.width - ct.width) / 2}px`
      y = position === 'top' ? `calc(${_y - ct.height}px - 0.5rem)` : `calc(${_y + ce.height}px + 0.5rem)`;
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
  class="tooltip">
    { hasKeybinding ? processKey(text)[0] : text }

    {#if hasKeybinding}
      &nbsp; <span class="flex ml-auto text-yellow-400">{ processKey(text)[1] }</span>
    {/if}
  </div>
</div>

<style lang="postcss">
  .wrapper {
    @apply w-fit h-fit;
    display: initial;
  }

  .tooltip {
    @apply fixed bg-neutral-600 px-3 py-2 rounded-sm flex
      transition-all text-neutral-200 items-center justify-center text-center;
    width: max-content;
    max-width: 35ch;
    transition-duration: var(--duration);
    transition-delay: var(--delay);
    left: var(--x);
    top: var(--y);
    z-index: 999;
    font-size: 1rem;
    filter: drop-shadow(0 0 0.2rem #222);
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