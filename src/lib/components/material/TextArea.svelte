<script lang="ts">
  import { defaultInner } from "@helpers/strings";
  import { twMerge } from "tailwind-merge";

  interface TextareaProps {
    value?: string;
    cClass?: string;
    placeholder?: string;
    blurOnEscape?: boolean;
    spellcheck?: boolean;
    readOnly?: boolean;
    class?: string;
    getInnerText?: (s: string, withSuffix?: boolean) => string;
    onclick?: (ev: MouseEvent) => any;
    onkeyup?: (ev: KeyboardEvent) => any;
    onkeydown?: (ev: KeyboardEvent) => any;
    onfocus?: (ev: FocusEvent) => any;
    onblur?: (ev: FocusEvent) => any;
  }

  let {
    value = $bindable(""),
    cClass = $bindable(""),
    placeholder = $bindable(""),
    blurOnEscape = $bindable(false),
    spellcheck = $bindable(false),
    readOnly = $bindable(false),
    class: cl = $bindable(""),
    getInnerText = $bindable(defaultInner),
    onclick,
    onkeyup,
    onkeydown,
    onfocus,
    onblur,
  }: TextareaProps = $props();

  let innerText = $state("<br>");
  let textarea: HTMLTextAreaElement | undefined = $state();
  let cedit: HTMLPreElement | undefined = $state();

  const commonStyle = `lesp bg-transparent outline-none p-2 rounded-md text-start
    h-full break-words whitespace-pre-wrap overflow-auto ubuntu-mono stable`;

  export function getTextArea() {
    return textarea;
  }

  export function getContentEdit() {
    return cedit;
  }

  export function updateInnerText(v: string = value) {
    innerText = getInnerText(v);
  }

  function handleKeyup(e: KeyboardEvent) {
    onkeyup && onkeyup(e);
    if (blurOnEscape && e.code === "Escape") {
      textarea?.blur();
    }
  }

  function focusTextArea() {
    cedit?.blur();
    textarea?.focus();
  }

  function handleScrollFactory(A: HTMLElement, B: HTMLElement) {
    return () => (A.scrollTop = B.scrollTop);
  }

  $effect(() => updateInnerText(value));
</script>

<div class={twMerge("relative bg-base-100 rounded-md", cClass)} onfocus={focusTextArea}>
  <pre
    onfocus={focusTextArea}
    bind:this={cedit}
    onscroll={handleScrollFactory(textarea!, cedit!)}
    class={twMerge(commonStyle, "pointer-events-none", cl)}
    bind:innerHTML={innerText}
    contenteditable="false"
    {spellcheck}></pre>

  <textarea
    disabled={readOnly}
    onkeyup={handleKeyup}
    {onkeydown}
    {onfocus}
    {onblur}
    {onclick}
    onscroll={handleScrollFactory(cedit, textarea!)}
    {placeholder}
    bind:this={textarea}
    {spellcheck}
    bind:value
    class={twMerge(
      commonStyle,
      `text-transparent caret-white absolute inset-0 w-full h-full resize-none`,
      cl
    )}
  ></textarea>
</div>

<style lang="postcss">
  .lesp {
    letter-spacing: normal;
  }

  .stable {
    scrollbar-gutter: stable;
  }

  textarea::placeholder {
    @apply text-base-content;
  }
</style>
