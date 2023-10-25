<script lang="ts">
  import { getStackingContext } from '@helpers/DOM';
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

  function resize() {
    let ce = elem.getBoundingClientRect();
    let ct = tt.getBoundingClientRect();

    let _x = ce.x;
    let _y = ce.y;

    let e1: HTMLElement | null | undefined = getStackingContext(elem);
    let cp = e1.getBoundingClientRect();

    if ( !(e1.getAttribute('data-type') === 'modal') ) {
      _x -= cp.x;
      _y -= cp.y;
    }

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

<!-- svelte-ignore a11y-no-static-element-interactions -->
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
</style>