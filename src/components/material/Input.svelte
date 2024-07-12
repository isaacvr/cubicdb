<script lang="ts">
  import { minmax } from "@helpers/math";
  import { createEventDispatcher, tick } from "svelte";

  const dispatch = createEventDispatcher();

  type InputType = "text" | "number" | "date";

  export let placeholder = "";
  export let value: Date | string | number = "";
  export let type: InputType = "text";
  export let size: number | undefined = undefined;
  export let disabled = false;
  export let focus = false;
  export let min: number | undefined = undefined;
  export let max: number | undefined = undefined;
  export let step = 1;
  export let inpClass = "";
  export let stopKeyupPropagation = false;
  export let stopKeydownPropagation = false;

  let cl = "";
  export { cl as class };

  let ref: HTMLInputElement;

  $: type = ["text", "number", "date"].indexOf(type) === -1 ? "text" : type;
  $: focus ? ref && tick().then(() => ref?.focus()) : ref && tick().then(() => ref?.blur());

  function keyup(e: KeyboardEvent) {
    stopKeyupPropagation && e.stopPropagation();
    dispatch("keyup", e);
    (e.code === "Enter" || e.code === "NumpadEnter" || e.key === "Enter") && dispatch("UENTER", e);
    e.code === "Esc" && dispatch("UESCAPE", e);
  }

  function keydown(e: KeyboardEvent) {
    stopKeydownPropagation && e.stopPropagation();
    dispatch("keydown", e);
    (e.code === "Enter" || e.code === "NumpadEnter" || e.key === "Enter") && dispatch("DENTER", e);
    e.code === "Esc" && dispatch("DESCAPE", e);
  }

  function input(e: any) {
    dispatch("input", e);
  }

  function change(e: any) {
    let t = e.target;

    if (t.type === "number") {
      let min = t.min ? +t.min : -Infinity;
      let max = t.max ? +t.max : Infinity;

      t.value = value = minmax(t.value, min, max);
    }

    dispatch("change", e);
  }

  function click(e: MouseEvent) {
    dispatch("click", e);
  }
</script>

<div
  class="w-full h-10 px-2 py-2 rounded-md relative transition-all
  duration-200 border border-solid border-gray-400 wrapper pointer-events-none
  {cl || 'bg-gray-600 text-gray-300'}"
>
  {#if type === "text"}
    <input
      class={inpClass || ""}
      bind:this={ref}
      bind:value
      on:click={click}
      on:keydown={keydown}
      on:keyup={keyup}
      on:input={input}
      on:change={change}
      {disabled}
      type="text"
      autocomplete="off"
      {size}
      placeholder=""
    />
  {/if}

  {#if type === "number"}
    <input
      class={inpClass || ""}
      {min}
      {max}
      {disabled}
      {step}
      type="number"
      on:click={click}
      on:keydown={keydown}
      on:keyup={keyup}
      on:input={input}
      on:change={change}
      bind:value
      placeholder=""
    />
  {/if}

  {#if type === "date"}
    <input
      class={inpClass || ""}
      {disabled}
      type="date"
      on:click={click}
      on:keydown={keydown}
      on:keyup={keyup}
      on:input={input}
      on:change={change}
      bind:value
      placeholder=""
    />
  {/if}
  <span class="placeholder">{placeholder}</span>
</div>

<style lang="postcss">
  input {
    @apply h-full flex w-full bg-transparent border-none outline-none
      text-inherit pointer-events-auto ring-0;
  }

  input[disabled] {
    @apply pointer-events-none;
  }

  input::placeholder {
    opacity: 0;
  }

  .placeholder {
    @apply absolute top-0 my-2 origin-left transition-all duration-200
    text-neutral-500;
  }

  input:focus + .placeholder {
    @apply absolute top-0 -my-5 scale-75 text-black;
  }

  input:not(:placeholder-shown) + .placeholder {
    @apply absolute top-0 -my-5 scale-75;
  }

  .hidden-markers input::-webkit-outer-spin-button,
  .hidden-markers input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style>
