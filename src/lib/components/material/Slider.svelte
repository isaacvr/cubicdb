<script lang="ts">
  import { map, minmax } from "@helpers/math";
  import { createEventDispatcher, onMount } from "svelte";

  // let type: 'simple' | 'range' | 'reverse' = "simple";
  export let min = 0;
  export let max = 100;
  export let value = 0;

  let dispatch = createEventDispatcher();
  let wrapper: HTMLButtonElement;
  let mark: HTMLButtonElement;
  let moving = false;
  let isMounted = false;
  let cl = "";
  export { cl as class };

  function mousedownHandler(ev: MouseEvent) {
    moving = true;
    xToValue(ev.x);
    dispatch("mousedown", ev);
  }

  function mouseupHandler() {
    moving = false;
  }

  function xToValue(x: number) {
    let box = wrapper.getBoundingClientRect();
    let percent = minmax(map(x, box.x, box.x + box.width, 0, 100), 0, 100);
    mark.style.setProperty("--left", percent + "%");
    value = min + (percent * (max - min)) / 100;
  }

  function mousemoveHandler(ev: MouseEvent) {
    if (!moving) return;
    xToValue(ev.x);
  }

  function valueToPercent(v: number) {
    let percent = (100 * (v - min)) / (max - min);

    if (percent < 0) {
      value = min;
      percent = 0;
    } else if (percent > 100) {
      value = max;
      percent = 100;
    }

    mark.style.setProperty("--left", percent + "%");
  }

  function wrapperClickHandler(ev: MouseEvent) {
    xToValue(ev.x);
  }

  onMount(() => {
    isMounted = true;
    valueToPercent(value);
  });

  $: isMounted && valueToPercent(value);
</script>

<svelte:window on:mousemove={mousemoveHandler} on:mouseup={mouseupHandler} />

<button
  bind:this={wrapper}
  class={"wrapper " + (cl || "")}
  on:click={wrapperClickHandler}
  on:mousedown={mousedownHandler}
>
  <button bind:this={mark} class="mark"></button>
</button>

<style lang="postcss">
  .wrapper {
    @apply flex items-center w-full h-1 bg-gray-500 cursor-pointer rounded-full my-3 relative;
  }

  .mark {
    @apply w-4 h-4 bg-current rounded-full shadow-md absolute -translate-x-1/2;
    --left: 0%;
    left: var(--left);
  }
</style>
