<script lang="ts">
  import { defaultInner } from "@helpers/strings";
  import { createEventDispatcher } from "svelte";

  export let value = "";
  export let cClass = "";
  export let placeholder = "";
  export let blurOnEscape = false;
  export let spellcheck = false;
  export let readOnly = false;
  export let getInnerText = defaultInner;

  let cl = "";
  export { cl as class };

  let innerText = "<br>";
  let dispatch = createEventDispatcher();
  let textarea: HTMLTextAreaElement;
  let cedit: HTMLPreElement;

  export function getTextArea() {
    return textarea;
  }

  export function getContentEdit() {
    return cedit;
  }

  export function updateInnerText() {
    innerText = getInnerText(value);
  }

  function keyup(e: KeyboardEvent) {
    dispatch("keyup", e);

    if (blurOnEscape && e.code === "Escape") {
      textarea.blur();
    }
  }

  function keydown(e: KeyboardEvent) {
    dispatch("keydown", e);
  }

  function focus(e: FocusEvent) {
    dispatch("focus", e);
  }

  function blur(e: FocusEvent) {
    dispatch("blur", e);
  }

  function click(e: MouseEvent) {
    dispatch("click", e);
  }

  function focusTextArea() {
    cedit.blur();
    textarea.focus();
  }

  function handleScrollFactory(A: HTMLElement, B: HTMLElement) {
    return () => (A.scrollTop = B.scrollTop);
  }

  $: innerText = getInnerText(value);
</script>

<div class="relative {cClass || ''}" on:focus={focusTextArea}>
  <pre
    on:focus={focusTextArea}
    bind:this={cedit}
    on:scroll={handleScrollFactory(textarea, cedit)}
    class={`lesp bg-transparent outline-none p-2 pointer-events-none rounded-md text-start
      h-full break-words whitespace-pre-wrap overflow-auto stable monaco ` +
      (cl || "bg-gray-600 text-gray-300")}
    bind:innerHTML={innerText}
    contenteditable="false"
    {spellcheck}></pre>
  <textarea
    disabled={readOnly}
    on:keyup={keyup}
    on:keydown={keydown}
    on:focus={focus}
    on:blur={blur}
    on:click={click}
    on:scroll={handleScrollFactory(cedit, textarea)}
    {placeholder}
    bind:this={textarea}
    {spellcheck}
    bind:value
    class={`lesp bg-transparent outline-none p-2 rounded-md text-start text-transparent
    caret-white transition-all duration-200 absolute inset-0 w-full h-full resize-none
        break-words whitespace-pre-wrap overflow-auto stable monaco ` +
      (cl || "bg-gray-600 text-gray-300")}
  ></textarea>
</div>

<style>
  .lesp {
    letter-spacing: 1.1px;
  }

  .stable {
    scrollbar-gutter: stable;
  }
</style>
